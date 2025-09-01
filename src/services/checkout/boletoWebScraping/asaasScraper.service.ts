import puppeteer, { Browser, Page, HTTPResponse } from 'puppeteer';

const LAUNCH_OPTIONS = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true,
    defaultViewport: { width: 1200, height: 800 }
};

let browserSingleton: Browser | null = null;

function createLimiter(concurrency: number) {
    let active = 0;
    const q: Array<() => void> = [];
    return async function <T>(fn: () => Promise<T>): Promise<T> {
        if (active >= concurrency) await new Promise<void>(r => q.push(r));
        active++;
        try { return await fn(); } finally {
            active--;
            const next = q.shift();
            if (next) next();
        }
    };
}
const limiter = createLimiter(2);

async function getBrowser(): Promise<Browser> {
    if (!browserSingleton) {
        browserSingleton = await puppeteer.launch(LAUNCH_OPTIONS);
        process.on('exit', async () => { try { await browserSingleton?.close(); } catch { } });
    }
    return browserSingleton;
}

export interface ScrapeResult {
    pdf?: Buffer | null;
    fallbackUrl?: string | null;
    logs?: string[];
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function clickElementByText(page: Page, text: string): Promise<boolean> {
    const needle = String(text).trim().toLowerCase();
    return page.evaluate((needleInner) => {
        const els = Array.from(document.querySelectorAll('a, button, [role="button"]'));
        for (const el of els) {
            const txt = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').toString().trim().toLowerCase();
            if (txt.includes(needleInner)) { (el as HTMLElement).click(); return true; }
        }
        return false;
    }, needle);
}

async function findPdfAnchorInFrames(page: Page): Promise<string | null> {
    const main = await page.evaluate(() => {
        const a = Array.from(document.querySelectorAll('a[href$=".pdf"], a[download], a[href*="download"]'))[0] as HTMLAnchorElement | undefined;
        return a ? a.href : null;
    }).catch(() => null);
    if (main) return main;

    for (const f of page.frames()) {
        try {
            const inside = await f.evaluate(() => {
                const a = Array.from(document.querySelectorAll('a[href$=".pdf"], a[download], a[href*="download"]'))[0] as HTMLAnchorElement | undefined;
                return a ? a.href : null;
            }).catch(() => null);
            if (inside) return inside;
        } catch { }
    }
    return null;
}

function startsWithPdfMagic(buf: Buffer): boolean {
    if (!buf || buf.length < 4) return false;
    return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
}

/** tenta derivar possíveis URLs de preview/download a partir de uma URL /i/{id} */
function derivePreviewUrlsFromInteractiveUrl(url: string): string[] {
    try {
        const u = new URL(url);
        const path = u.pathname; // ex: /i/2mp...
        const m = path.match(/\/i\/([^\/?#]+)/);
        const out: string[] = [];
        if (m && m[1]) {
            const id = m[1];
            out.push(`${u.protocol}//${u.host}/b/preview/${id}`);
            out.push(`${u.protocol}//${u.host}/b/download/${id}`);
            out.push(`${u.protocol}//${u.host}/b/${id}`);
        }
        return out;
    } catch { return []; }
}

/** procura em atributos onclick/data-* por links que contenham /b/preview ou /b/download */
async function scanDomForPreviewLinks(page: Page): Promise<string | null> {
    return page.evaluate(() => {
        const candidates: string[] = [];
        const els = Array.from(document.querySelectorAll('*'));
        for (const el of els) {
            // href/data-href/data-src/onclick/title/aria-label
            try {
                const href = (el as HTMLElement).getAttribute?.('href') || (el as HTMLElement).getAttribute?.('data-href') || (el as HTMLElement).getAttribute?.('data-src') || '';
                if (href && (href.includes('/b/preview') || href.includes('/b/download') || href.includes('/b/'))) {
                    candidates.push(href);
                }
                const onclick = (el as HTMLElement).getAttribute?.('onclick') || '';
                if (onclick && (onclick.includes('/b/preview') || onclick.includes('/b/download') || onclick.includes('/b/'))) {
                    // extrair url dentro onclick: window.open('...') ou window.location='...'
                    const match = onclick.match(/(https?:\/\/[^'")\s]+)/);
                    if (match) candidates.push(match[1]);
                }
                const title = (el as HTMLElement).getAttribute?.('title') || (el as HTMLElement).getAttribute?.('aria-label') || '';
                if (title && (title.toLowerCase().includes('ver boleto') || title.toLowerCase().includes('visualizar') || title.toLowerCase().includes('baixar'))) {
                    // se tiver href pai, use
                    const parentA = el.closest('a');
                    if (parentA && parentA.href) candidates.push(parentA.href);
                }
            } catch { }
        }
        // retornar o primeiro candidato absoluto (se relatifvo, torna absoluto usando location)
        for (const c of candidates) {
            try {
                const url = new URL(c, location.href).href;
                return url;
            } catch { }
        }
        return null;
    });
}

/** faz busca por strings /b/preview dentro do HTML (scripts) */
async function findPreviewUrlInHtmlContent(page: Page): Promise<string | null> {
    const html = await page.content().catch(() => '');
    if (!html) return null;
    const re = /(https?:\/\/[^"'()>\s]+\/b\/(?:preview|download|)[^"'()>\s]*)/ig;
    const m = re.exec(html);
    if (m && m[1]) return m[1];
    // fallback: buscar id e construir via derivePreviewUrlsFromInteractiveUrl
    return null;
}

/** Nova função para clicar no botão de download específico do Asaas */
async function clickAsaasDownloadButton(page: Page): Promise<boolean> {
    try {
        // Tentar seletor específico do botão "Baixar boleto" do Asaas
        const downloadButtonSelector = 'button[class*="download"], a[class*="download"], button:contains("Baixar boleto"), a:contains("Baixar boleto")';

        await page.waitForSelector(downloadButtonSelector, { timeout: 5000 });
        await page.click(downloadButtonSelector);
        return true;
    } catch (error) {
        return false;
    }
}

export async function fetchBoletoPdfFromAsaasInteractive(asaasInteractiveUrl: string, opts?: { timeoutMs?: number }): Promise<ScrapeResult> {
    return limiter(async () => {
        const logs: string[] = [];
        const timeoutMs = opts?.timeoutMs ?? 30000;
        let page: Page | null = null;
        let pdfBuffer: Buffer | null = null;
        let fallbackUrl: string | null = null;
        const browser = await getBrowser();

        try {
            page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');
            await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' });

            const onResponse = async (res: HTTPResponse) => {
                try {
                    const url = res.url();
                    const headers = res.headers();
                    const ct = (headers['content-type'] || '').toLowerCase();
                    const cd = (headers['content-disposition'] || '').toLowerCase();
                    const likelyPdfByHeader = ct.includes('pdf');
                    const likelyPdfByDisposition = cd.includes('.pdf') || cd.includes('attachment');
                    const likelyPdfByUrl = /\.pdf($|\?)/i.test(url);
                    if (!(likelyPdfByHeader || likelyPdfByDisposition || likelyPdfByUrl)) return;
                    const buf = await res.buffer();
                    if (startsWithPdfMagic(buf)) {
                        pdfBuffer = buf;
                    } else {
                        logs.push(`rejected non-pdf candidate: ${url} (content-type=${ct})`);
                    }
                } catch (e) { logs.push('onResponse error: ' + String(e)); }
            };
            page.on('response', onResponse);

            logs.push(`navigating to ${asaasInteractiveUrl}`);
            await page.goto(asaasInteractiveUrl, { waitUntil: 'networkidle2', timeout: timeoutMs }).catch(e => logs.push('goto failed: ' + String(e)));

            if (pdfBuffer) { page.off('response', onResponse); await page.close(); return { pdf: pdfBuffer, logs }; }

            // Tentar clicar no botão de download específico do Asaas
            if (page.url().includes('/b/preview/')) {
                logs.push('Página de preview detectada, tentando clicar no botão de download');
                const downloadClicked = await clickAsaasDownloadButton(page);
                if (downloadClicked) {
                    logs.push('Botão de download clicado, aguardando download');
                    await sleep(2000);
                }
            }

            // 1) procura anchor /b/preview/ diretamente no DOM
            const previewAnchorHref = await page.evaluate(() => {
                const a = Array.from(document.querySelectorAll('a[href*="/b/preview/"], a[href*="/b/download/"], a[href*="/b/"]'))[0] as HTMLAnchorElement | undefined;
                return a ? a.href : null;
            }).catch(() => null);
            if (previewAnchorHref) {
                logs.push('found direct preview anchor: ' + previewAnchorHref);
                fallbackUrl = previewAnchorHref;
            }

            // 2) se não achou, escanear atributos/onclick/data-* (mais profundo)
            if (!fallbackUrl) {
                const found = await scanDomForPreviewLinks(page).catch(() => null);
                if (found) {
                    logs.push('found preview via DOM scan: ' + found);
                    fallbackUrl = found;
                }
            }

            // 3) se não achou, inspecionar HTML e procurar por urls
            if (!fallbackUrl) {
                const foundHtml = await findPreviewUrlInHtmlContent(page);
                if (foundHtml) {
                    logs.push('found preview in HTML content: ' + foundHtml);
                    fallbackUrl = foundHtml;
                }
            }

            // 4) se ainda nada, tentar heurística: mapear /i/{id} -> /b/preview/{id}
            if (!fallbackUrl) {
                const derived = derivePreviewUrlsFromInteractiveUrl(asaasInteractiveUrl);
                for (const d of derived) {
                    logs.push('trying derived URL: ' + d);
                    // tenta navegar e ver se respostas pdf aparecem
                    await page.goto(d, { waitUntil: 'networkidle2', timeout: Math.min(20000, timeoutMs) }).catch(e => logs.push('derived goto failed: ' + String(e)));
                    // verificar anchors/frames após navegar
                    const found = await findPdfAnchorInFrames(page);
                    if (found) { logs.push('found pdf anchor after derived navigation: ' + found); fallbackUrl = found; break; }
                    // se no navigation apareceram respostas de pdf já capturadas via onResponse, pdfBuffer será preenchido
                    if (pdfBuffer) break;
                }
            }

            // 5) se ainda sem fallbackUrl e sem pdfBuffer, tentar clicar "visualizar" e depois escanear novamente
            if (!fallbackUrl && !pdfBuffer) {
                const clicked = await clickElementByText(page, 'visualizar').catch(() => false);
                logs.push('clicked visualizar? ' + String(clicked));
                if (clicked) await sleep(900);
                const found = await findPdfAnchorInFrames(page);
                if (found) { logs.push('found pdf anchor post-click: ' + found); fallbackUrl = found; }
            }

            // 6) checar iframes para src=data:application/pdf;base64,... ou src com /b/preview
            if (!pdfBuffer && !fallbackUrl) {
                const iframeResult = await page.evaluate(() => {
                    const ifs = Array.from(document.querySelectorAll('iframe'));
                    for (const f of ifs) {
                        try {
                            const src = (f as HTMLIFrameElement).src || (f as any).dataset?.src || '';
                            if (src && src.startsWith('data:application/pdf')) return { type: 'data', src };
                            if (src && (src.includes('/b/preview') || src.includes('/b/download') || src.includes('/b/'))) return { type: 'link', src: new URL(src, location.href).href };
                        } catch { }
                    }
                    return null;
                }).catch(() => null);
                if (iframeResult) {
                    if (iframeResult.type === 'data') {
                        logs.push('found data:application/pdf in iframe');
                        // extract base64 payload and return as buffer
                        const payload = iframeResult.src.split(',', 2)[1];
                        if (payload) {
                            const buf = Buffer.from(payload, 'base64');
                            if (startsWithPdfMagic(buf)) {
                                page.off('response', onResponse);
                                await page.close();
                                return { pdf: buf, logs };
                            } else {
                                logs.push('iframe data payload not valid pdf (magic mismatch)');
                            }
                        }
                    } else if (iframeResult.type === 'link') {
                        logs.push('found iframe link to preview: ' + iframeResult.src);
                        fallbackUrl = iframeResult.src;
                    }
                }
            }

            // 7) se pdfBuffer capturado via onResponse, retornar
            if (pdfBuffer) {
                logs.push('pdf captured via network and validated');
                page.off('response', onResponse);
                await page.close();
                return { pdf: pdfBuffer, logs };
            }

            // 8) se fallbackUrl encontrado, fechar e retornar (caller fará redirect ou proxy)
            if (fallbackUrl) {
                page.off('response', onResponse);
                await page.close();
                return { pdf: null, fallbackUrl, logs };
            }

            // heurística final: trocar /b/preview/ por /b/download/ no url atual
            const curUrl = page.url();
            const heur = curUrl.replace('/b/preview/', '/b/download/');
            if (heur !== curUrl) {
                logs.push('trying heuristic swap preview->download: ' + heur);
                page.off('response', onResponse);
                await page.close();
                return { pdf: null, fallbackUrl: heur, logs };
            }

            page.off('response', onResponse);
            await page.close();
            return { pdf: null, fallbackUrl: null, logs: logs.concat(['não foi possível obter PDF automaticamente']) };

        } catch (err) {
            if (page && !page.isClosed()) try { await page.close(); } catch { }
            return { pdf: pdfBuffer, fallbackUrl, logs: (logs || []).concat(['fatal error: ' + String(err)]) };
        }
    });
}