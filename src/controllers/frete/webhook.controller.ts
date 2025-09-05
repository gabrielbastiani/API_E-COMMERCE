import { Request, Response } from "express";
import { MelhorEnvioWebhookService } from "../../services/frete/webhook.service";

const secret = process.env.MELHOR_ENVIO_API_URL ?? "";
const service = new MelhorEnvioWebhookService(secret);

export class WebhookController {
    static async receberMelhorEnvio(req: Request, res: Response) {
        // req.body é Buffer por causa de express.raw usado na rota
        const rawBody = req.body as Buffer;
        const signature = (req.headers["x-me-signature"] as string) || (req.headers["X-ME-Signature"] as string);

        if (!service.verifySignature(rawBody, signature)) {
            res.status(401).json({ ok: false, message: "Invalid signature" });
        }

        let parsed: any;
        try {
            const text = rawBody.toString("utf8");
            parsed = JSON.parse(text);
        } catch (err) {
            res.status(400).json({ ok: false, message: "Invalid JSON body" });
        }

        const event = parsed?.event ?? null;
        const data = parsed?.data ?? null;
        const dataId = data?.id ?? null;

        // Salva log
        try {
            /* const log = await service.saveLog(event, dataId, parsed, signature); */
            // Processa evento
            /* await service.handleEvent(event, data, log.id); */
            // Responder com 200 OK (Melhor Envio considera sucesso se 2xx)
            res.status(200).json({ ok: true });
        } catch (err: any) {
            // Falha interna: retornamos 500 — Melhor Envio fará retry segundo docs.
            console.error("Erro processando webhook Melhor Envio:", err);
            res.status(500).json({ ok: false, message: "Internal error" });
        }
    }
}