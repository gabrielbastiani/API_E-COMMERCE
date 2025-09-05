import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

export class MelhorEnvioWebhookService {
    private secret: string;

    constructor(secret: string) {
        if (!secret) throw new Error("MELHOR_ENVIO_APP_SECRET não configurado.");
        this.secret = secret;
    }

    /**
     * Verifica assinatura HMAC-SHA256. Recebe o raw body (Buffer)
     * e o header 'x-me-signature' (assume base64).
     */
    verifySignature(rawBody: Buffer, signatureHeader?: string): boolean {
        if (!signatureHeader) return false;

        const computed = crypto
            .createHmac("sha256", this.secret)
            .update(rawBody)
            .digest("base64");

        // Comparação tempo-constante
        try {
            const a = Buffer.from(computed);
            const b = Buffer.from(signatureHeader);
            if (a.length !== b.length) {
                // evitar timing leak
                return false;
            }
            return crypto.timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }

    /**
     * Salva log do webhook (raw payload) e devolve o registro criado.
     * Usamos payloadJson já parseado.
     */
    /* async saveLog(event: string, dataId: string | null, payloadJson: any, signature?: string) {
        return prisma.melhorEnvioWebhookLog.create({
            data: {
                event,
                dataId,
                payload: payloadJson,
                signature,
            },
        });
    } */

    /**
     * Checa idempotência: se já processado evento com dataId e mesmo event, não repete.
     */
    /* async isAlreadyProcessed(event: string, dataId?: string | null) {
        if (!dataId) return false;
        const existing = await prisma.melhorEnvioWebhookLog.findFirst({
            where: { event, dataId, processed: true },
        });
        return !!existing;
    } */

    /**
     * Marca log como processado (ou com erro)
     */
    /* async markProcessed(logId: string, processed = true, error?: string) {
        return prisma.melhorEnvioWebhookLog.update({
            where: { id: logId },
            data: {
                processed,
                processedAt: new Date(),
                error: error ?? null,
            },
        });
    } */

    /**
     * Rode o handler principal para eventos. 
     * Mapeará os eventos order.* e atualizará tabela ShippingLabel (exemplo).
     */
    async handleEvent(event: string, payloadData: any, logRecordId: string) {
        // payloadData tem formato { id, protocol, status, tracking, ... } conforme docs.
        const data = payloadData;
        const melhorId = data?.id ?? null;
        const status = data?.status ?? null;
        const protocol = data?.protocol ?? null;
        const tracking = data?.tracking ?? null;
        const trackingUrl = data?.tracking_url ?? data?.trackingUrl ?? null;

        // Idempotency by checking saved logs already processed:
        /* if (await this.isAlreadyProcessed(event, melhorId)) {
            await this.markProcessed(logRecordId, true, undefined);
            return { skipped: true, reason: "already processed" };
        } */

        // Basic mapping: crie ou atualize registro ShippingLabel
        try {
            /* if (!melhorId) {
                await this.markProcessed(logRecordId, true);
                return { ok: true, note: "no melhor envio id" };
            } */

            // Tenta encontrar label existente
            /* const existing = await prisma.shippingLabel.findUnique({
                where: { melhorEnvioId: melhorId },
            }); */

            const newStatus = status ?? event.split(".").pop();

            /* if (!existing) {
                await prisma.shippingLabel.create({
                    data: {
                        melhorEnvioId: melhorId,
                        protocol,
                        status: newStatus ?? "unknown",
                        tracking,
                        trackingUrl,
                    },
                });
            } else {
                await prisma.shippingLabel.update({
                    where: { melhorEnvioId: melhorId },
                    data: {
                        protocol: protocol ?? existing.protocol,
                        status: newStatus ?? existing.status,
                        tracking: tracking ?? existing.tracking,
                        trackingUrl: trackingUrl ?? existing.trackingUrl,
                    },
                });
            } */

            // A partir daqui você pode acionar outras ações do seu sistema:
            // - atualizar um pedido vinculado (order) para marcar como "enviado", "entregue", etc.
            // - notificar usuários por email
            // - atualizar rastreamento na GUI do admin
            // EXEMPLO (comente/descomente e ajuste conforme seu schema):
            //
            // if (newStatus === "delivered") {
            //   await prisma.order.update({
            //     where: { melhorEnvioId: melhorId },
            //     data: { status: "delivered" }
            //   })
            // }

            /* await this.markProcessed(logRecordId, true); */
            return { ok: true };
        } catch (err: any) {
            /* await this.markProcessed(logRecordId, false, String(err.message ?? err)); */
            throw err;
        }
    }
}