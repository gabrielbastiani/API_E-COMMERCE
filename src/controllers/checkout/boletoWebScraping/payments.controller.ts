import { RequestHandler } from 'express';
import prisma from '../../../prisma';
import axios from 'axios';
import { fetchBoletoPdfFromAsaasInteractive } from '../../../services/checkout/boletoWebScraping/asaasScraper.service';

function log(...args: any[]) { console.log('[getBoletoPdf]', ...args); }

export const getBoletoPdf: RequestHandler = async (req, res) => {
    const safeRespond = {
        json: (status: number, body: any): boolean => {
            if (res.headersSent) { log('Attempted json after headers sent'); return false; }
            res.status(status).json(body);
            return true;
        },
        sendPdfBuffer: (buf: Buffer, filename: string, contentType = 'application/pdf'): boolean => {
            if (res.headersSent) { log('Attempted sendPdfBuffer after headersSent'); return false; }
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buf);
            return true;
        },
        redirect: (url: string): boolean => {
            if (res.headersSent) { log('Attempted redirect after headersSent to', url); return false; }
            res.redirect(url);
            return true;
        }
    };

    function isPdfBuffer(buf: Buffer | null | undefined) {
        if (!buf || buf.length < 4) return false;
        return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
    }

    function deriveDownloadUrlsFromPreview(previewUrl: string): string[] {
        try {
            const u = new URL(previewUrl);
            const hostBase = `${u.protocol}//${u.host}`;
            const path = u.pathname;
            const candidates: string[] = [];

            if (path.includes('/b/preview/')) {
                const id = path.split('/').pop();
                candidates.push(`${hostBase}/b/pdf/${id}`);
                candidates.push(`${hostBase}/b/download/${id}`);
            }

            return Array.from(new Set(candidates));
        } catch {
            return [previewUrl];
        }
    }

    try {
        const paymentId = req.params.paymentId;
        if (!paymentId) {
            safeRespond.json(400, { message: 'paymentId requerido' });
            return;
        }

        const requesterCustomerId = (req as any).customer_id as string | undefined;
        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment) {
            safeRespond.json(404, { message: 'Pagamento não encontrado' });
            return;
        }
        if (requesterCustomerId && String(payment.customer_id) !== String(requesterCustomerId)) {
            safeRespond.json(403, { message: 'Não autorizado para acessar esse boleto' });
            return;
        }

        const gatewayRawAny: any = (payment.gateway_response as any)?.raw ?? (payment.gateway_response as any) ?? {};
        const boletoUrl = (payment.boleto_url ?? gatewayRawAny?.invoiceUrl ?? gatewayRawAny?.bankSlipUrl ?? null) as string | null;

        // Guardar a URL interativa original para fallback
        const interactiveUrl = boletoUrl ?? gatewayRawAny?.invoiceUrl ?? gatewayRawAny?.bankSlipUrl ?? null;

        if (!interactiveUrl) {
            safeRespond.json(400, { message: 'Nenhuma URL de boleto disponível' });
            return;
        }

        if (boletoUrl && /\.pdf($|\?)/i.test(boletoUrl)) {
            try {
                log('Attempting direct fetch of boleto URL (heuristic):', boletoUrl);
                const resp = await axios.get(boletoUrl, { responseType: 'arraybuffer', timeout: 15000 });
                const buf = Buffer.from(resp.data);
                if (isPdfBuffer(buf)) {
                    safeRespond.sendPdfBuffer(buf, `boleto-${paymentId}.pdf`, resp.headers['content-type'] ?? 'application/pdf');
                    return;
                } else {
                    log('Direct fetch returned non-PDF buffer, falling back to scraper for', boletoUrl);
                }
            } catch (err) {
                log('Direct fetch failed (will fallback to scraper):', String(err));
            }
        }

        log('Calling scraper for interactive URL:', interactiveUrl);
        const result = await fetchBoletoPdfFromAsaasInteractive(String(interactiveUrl), { timeoutMs: 30000 });

        if (result.pdf) {
            log('Scraper returned PDF buffer (validated) — sending to client');
            safeRespond.sendPdfBuffer(result.pdf, `boleto-${paymentId}.pdf`);
            return;
        }

        if (result.fallbackUrl) {
            const fallback = result.fallbackUrl;
            log('Scraper returned fallback URL:', fallback);

            const candidates = deriveDownloadUrlsFromPreview(fallback);
            log('Derived download candidates:', candidates);

            for (const url of candidates) {
                try {
                    log('Trying candidate fetch:', url);
                    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000, maxRedirects: 5 });
                    const buf = Buffer.from(resp.data);
                    if (isPdfBuffer(buf)) {
                        log('Candidate returned valid PDF, proxying to client:', url);
                        safeRespond.sendPdfBuffer(buf, `boleto-${paymentId}.pdf`, resp.headers['content-type'] ?? 'application/pdf');
                        return;
                    } else {
                        log('Candidate did not return PDF (magic bytes mismatch):', url, 'content-type=', resp.headers['content-type']);
                    }
                } catch (err) {
                    log('Candidate fetch failed (ignored):', url, String(err));
                }
            }

            // Se nenhum candidato funcionar, fallback para a URL interativa original
            log('All candidates failed, redirecting to original interactive URL:', interactiveUrl);
            safeRespond.redirect(interactiveUrl);
            return;
        }

        log('Scraper failed; logs:', result.logs ?? []);
        // Fallback para a URL interativa original em caso de falha completa
        safeRespond.redirect(interactiveUrl);
        return;

    } catch (err: any) {
        log('Unexpected error in getBoletoPdf:', String(err));
        if (!res.headersSent) {
            safeRespond.json(500, { message: 'Erro interno ao recuperar boleto' });
        } else {
            console.error('[getBoletoPdf] Error after headersSent:', err);
        }
    }
};