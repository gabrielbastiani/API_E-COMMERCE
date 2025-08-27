import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import axios, { AxiosResponse } from 'axios';
import prisma from '../../prisma';
import { isAuthenticatedCustomer } from '../../middlewares/isAuthenticatedCustomer';

const router = express.Router();

/**
 * Config ASAAS (use suas env vars)
 */
const ASAAS_BASE = process.env.ASAAS_BASE_URL ?? process.env.ASAAS_API_BASE ?? 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY ?? process.env.ASAAS_API_KEY_SANDBOX ?? process.env.ASAAS_API_KEY_PRODUCAO;
if (!ASAAS_API_KEY) console.warn('ASAAS API key not provided (ASAAS_API_KEY) - calls to Asaas API will fail.');

/**
 * Helper: converte um stream (axios response.data) para Buffer
 */
function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (err) => reject(err));
    });
}

/**
 * Tenta baixar e enviar ao cliente o conteúdo de `url`.
 * - Se for PDF, faz pipe direto com headers apropriados.
 * - Se retornar HTML, tenta extrair possíveis links de preview/PDF.
 */
async function tryFetchAndStream(url: string, res: Response, inline = false): Promise<{ streamed?: true; previewUrl?: string; ok?: boolean }> {
    try {
        const resp: AxiosResponse<any> = await axios.get(url, {
            responseType: 'stream',
            maxRedirects: 5,
            headers: {
                Accept: 'application/pdf,application/octet-stream,text/html,*/*',
                'User-Agent': 'Ecommerce-Boleto-Proxy/1.0 (+yourdomain)',
            },
            timeout: 20000,
        });

        const contentType = String(resp.headers['content-type'] ?? '').toLowerCase();

        // Caso direto PDF ou octet-stream -> stream para cliente
        if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
            res.setHeader('Content-Type', 'application/pdf');
            if (inline) {
                res.setHeader('Content-Disposition', `inline; filename="boleto.pdf"`);
            } else {
                res.setHeader('Content-Disposition', `attachment; filename="boleto.pdf"`);
            }
            if (resp.headers['content-length']) {
                res.setHeader('Content-Length', resp.headers['content-length']);
            }
            (resp.data as NodeJS.ReadableStream).pipe(res);
            return { streamed: true };
        }

        // Se HTML / texto -> extrair possíveis links para preview/pdf dentro do HTML
        if (contentType.includes('text/html') || contentType.includes('text/plain') || contentType === '') {
            const buffer = await streamToBuffer(resp.data);
            const text = buffer.toString('utf8');

            // Padrões comuns que vimos nos HTMLs do Asaas (ajuste se necessário)
            const previewRegexes = [
                /href=(?:'|")([^'"]*\/b\/preview\/[^\s'"]+)(?:'|")/i,
                /href=(?:'|")([^'"]*\/b\/pdf\/[^\s'"]+)(?:'|")/i,
                /href=(?:'|")([^'"]*\/b\/[^\s'"]+)(?:'|")/i,
                /window\.open\(['"]([^'"]*\/b\/preview\/[^'"]+)['"]\)/i,
                /src=(?:'|")([^'"]*\/b\/preview\/[^\s'"]+)(?:'|")/i,
            ];

            for (const rx of previewRegexes) {
                const m = text.match(rx);
                if (m && m[1]) {
                    try {
                        const previewUrl = new URL(m[1], url).href;
                        return { previewUrl };
                    } catch {
                        return { previewUrl: m[1] };
                    }
                }
            }

            // Fallback: tenta extrair algum /b/preview/ ou barPattern em qualquer parte do HTML
            const anyPreview = text.match(/\/b\/preview\/([A-Za-z0-9\-_]+)/i) ?? text.match(/\/b\/([A-Za-z0-9\-_]+)/i);
            if (anyPreview && anyPreview[0]) {
                try {
                    const u = new URL(anyPreview[0], url).href;
                    return { previewUrl: u };
                } catch {
                    return { previewUrl: anyPreview[0] };
                }
            }

            // se não encontrou nada, retorna ok:false para tentar outras estratégias
            return { ok: false };
        }

        return { ok: false };
    } catch (err) {
        // não vaza detalhes sensíveis, apenas sinaliza falha
        console.warn('tryFetchAndStream error for', url, (err as any)?.message ?? err);
        return { ok: false };
    }
}

/**
 * Recupera dados da API Asaas para um pagamento (se tivermos asaas_payment_id)
 */
async function fetchAsaasPaymentInfo(asaasPaymentId: string) {
    if (!ASAAS_API_KEY || !ASAAS_BASE) return null;
    try {
        const resp = await axios.get(`${ASAAS_BASE.replace(/\/+$/, '')}/payments/${encodeURIComponent(asaasPaymentId)}`, {
            headers: {
                'access_token': ASAAS_API_KEY,
                Accept: 'application/json',
            },
            timeout: 15000,
        });
        return resp.data ?? null;
    } catch (err) {
        console.warn('fetchAsaasPaymentInfo failed for', asaasPaymentId, (err as any)?.response?.data ?? (err as any)?.message ?? err);
        return null;
    }
}

/**
 * Gera uma lista de candidatos alternativos para a URL 'i/<id>' do Asaas
 * Ex.: transforma '/i/abc' -> '/b/preview/abc', '/b/abc/pdf', etc.
 */
function generateAsaasCandidates(originalUrl: string): string[] {
    try {
        const u = new URL(originalUrl);
        const path = u.pathname || '';
        const iMatch = path.match(/\/i\/([^\/\?]+)/);
        const candidates: string[] = [];

        if (iMatch && iMatch[1]) {
            const id = iMatch[1];
            // possíveis variações (testadas em vários clientes)
            candidates.push(`${u.protocol}//${u.host}/b/preview/${id}`);
            candidates.push(`${u.protocol}//${u.host}/b/preview/${id}?download=1`);
            candidates.push(`${u.protocol}//${u.host}/b/${id}/pdf`);
            candidates.push(`${u.protocol}//${u.host}/b/pdf/${id}`);
            candidates.push(`${u.protocol}//${u.host}/b/${id}`);
            candidates.push(`${u.protocol}//${u.host}/b/preview/${id}/pdf`);
        }

        // se original já tinha '/b/preview' etc, tenta manter host+path
        candidates.push(originalUrl);
        return candidates;
    } catch {
        return [originalUrl];
    }
}

/**
 * Middleware para verificar autenticação (usa seu isAuthenticatedCustomer, mas mantive checagem extra)
 */
const authCheck: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    // your existing middleware isAuthenticatedCustomer will populate req.customer_id
    const requestingCustomerId = (req as any).customer_id;
    if (!requestingCustomerId) {
        res.status(401).json({ message: 'Não autenticado' });
        return;
    }
    next();
};

/**
 * Handler para endpoint de payments (usa paymentId direto)
 */
const paymentHandler: RequestHandler = async (req: Request, res: Response) => {
    const paymentId = req.params.paymentId;
    const inline = req.query.print === '1' || req.query.inline === '1';

    try {
        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }

        // autorização: certificar que o pedido pertence ao cliente requisitante (se disponível)
        const requestingCustomerId = (req as any).customer_id as string | undefined;
        if (requestingCustomerId && String(payment.customer_id) !== String(requestingCustomerId)) {
            res.status(403).json({ message: 'Não autorizado para acessar este boleto' });
            return;
        }

        if (!payment.boleto_url) {
            res.status(404).json({ message: 'boleto_url não disponível para este pagamento' });
            return;
        }

        const originalUrl = payment.boleto_url;

        // 1) primeira tentativa: baixar direto da URL salva no DB
        const firstTry = await tryFetchAndStream(originalUrl, res, inline);
        if (firstTry.streamed) return;

        // 2) se a primeira devolveu uma previewUrl (HTML com link), tentar essa preview
        if (firstTry.previewUrl) {
            const secondTry = await tryFetchAndStream(firstTry.previewUrl, res, inline);
            if (secondTry.streamed) return;
        }

        // 3) tentar buscar info no ASAAS via API (quando tivermos asaas_payment_id) - prefere link direto do gateway
        const asaasId = (payment.asaas_payment_id ?? payment.transaction_id ?? null) as string | null;
        if (asaasId) {
            const asaasData = await fetchAsaasPaymentInfo(asaasId);
            if (asaasData) {
                const possibleFields = [
                    // nomes diferentes que aparecem na doc/ambientes
                    'bankSlipUrl', 'invoiceUrl', 'boletoUrl', 'boleto_url', 'bankSlip', 'invoice_url', 'bankSlipUrlPreview', 'bankSlipPreview'
                ];
                for (const f of possibleFields) {
                    const candidate = asaasData[f];
                    if (candidate && typeof candidate === 'string') {
                        // tenta stream direto deste candidate
                        const tryCandidate = await tryFetchAndStream(candidate, res, inline);
                        if (tryCandidate.streamed) return;

                        // se veio HTML com preview link
                        if (tryCandidate.previewUrl) {
                            const t2 = await tryFetchAndStream(tryCandidate.previewUrl, res, inline);
                            if (t2.streamed) return;
                        }
                    }
                }
            }
        }

        // 4) gerar candidates (transforma /i/<id> em /b/preview/<id> e variações) e tentar cada um
        const candidates = generateAsaasCandidates(originalUrl);
        for (const c of candidates) {
            if (!c) continue;
            const cTry = await tryFetchAndStream(c, res, inline);
            if (cTry.streamed) return;
            if (cTry.previewUrl) {
                const t = await tryFetchAndStream(cTry.previewUrl, res, inline);
                if (t.streamed) return;
            }
        }

        // 5) nada funcionou -> redireciona para originalUrl (comportamento de fallback)
        return res.redirect(originalUrl);
    } catch (err: any) {
        console.error('Erro proxy boleto (payment):', err?.message ?? err);
        res.status(500).json({ message: 'Erro ao baixar boleto' });
    }
};

/**
 * Handler para orders/:orderId/boleto (procura o payment BOLETO mais recente do pedido)
 */
const orderHandler: RequestHandler = async (req: Request, res: Response) => {
    const orderId = req.params.orderId;
    const inline = req.query.print === '1' || req.query.inline === '1';

    try {
        const payment = await prisma.payment.findFirst({
            where: { order_id: orderId, method: 'BOLETO' as any },
            orderBy: { created_at: 'desc' } as any,
        });

        if (!payment) {
            res.status(404).json({ message: 'Payment (boleto) not found for order' });
            return;
        }

        const requestingCustomerId = (req as any).customer_id as string | undefined;
        if (requestingCustomerId && String(payment.customer_id) !== String(requestingCustomerId)) {
            res.status(403).json({ message: 'Não autorizado para acessar este boleto' });
            return;
        }

        if (!payment.boleto_url) {
            res.status(404).json({ message: 'boleto_url não disponível para este pagamento' });
            return;
        }

        const originalUrl = payment.boleto_url;

        const firstTry = await tryFetchAndStream(originalUrl, res, inline);
        if (firstTry.streamed) return;

        if (firstTry.previewUrl) {
            const secondTry = await tryFetchAndStream(firstTry.previewUrl, res, inline);
            if (secondTry.streamed) return;
        }

        const asaasId = (payment.asaas_payment_id ?? payment.transaction_id ?? null) as string | null;
        if (asaasId) {
            const asaasData = await fetchAsaasPaymentInfo(asaasId);
            if (asaasData) {
                const possibleFields = ['bankSlipUrl', 'invoiceUrl', 'boletoUrl', 'boleto_url', 'bankSlip', 'invoice_url'];
                for (const f of possibleFields) {
                    const candidate = asaasData[f];
                    if (candidate && typeof candidate === 'string') {
                        const tryCandidate = await tryFetchAndStream(candidate, res, inline);
                        if (tryCandidate.streamed) return;
                        if (tryCandidate.previewUrl) {
                            const t2 = await tryFetchAndStream(tryCandidate.previewUrl, res, inline);
                            if (t2.streamed) return;
                        }
                    }
                }
            }
        }

        // candidates heurísticos
        const candidates = generateAsaasCandidates(originalUrl);
        for (const c of candidates) {
            if (!c) continue;
            const cTry = await tryFetchAndStream(c, res, inline);
            if (cTry.streamed) return;
            if (cTry.previewUrl) {
                const t = await tryFetchAndStream(cTry.previewUrl, res, inline);
                if (t.streamed) return;
            }
        }

        // fallback -> redireciona
        return res.redirect(originalUrl);
    } catch (err: any) {
        console.error('Erro proxy boleto (order):', err?.message ?? err);
        res.status(500).json({ message: 'Erro ao baixar boleto' });
    }
};

// Registrar rotas (use seu middleware de autenticação)
router.get('/payments/:paymentId/boleto', isAuthenticatedCustomer, paymentHandler);
router.get('/orders/:orderId/boleto', isAuthenticatedCustomer, orderHandler);

export default router;