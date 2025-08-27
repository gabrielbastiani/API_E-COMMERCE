import { Request, Response } from 'express';
import * as AsaasWebhookService from '../../services/checkout/asaasWebhook.service';

export async function asaasWebhookReceiver(req: Request, res: Response) {
    try {
        // body já vem como JSON (certifique-se que app.use(express.json()) esteja configurado)
        const payload = req.body;
        const headerToken = (req.headers['asaas-access-token'] as string) || (req.headers['Asaas-Access-Token'] as string) || undefined;

        // processa e retorna um status 200 se tudo ok (Asaas re-tenta caso receba != 2xx)
        await AsaasWebhookService.processWebhook({ payload, headerToken });

        // resposta rápida — Asaas considera sucesso apenas se 2xx
        res.status(200).json({ ok: true });
    } catch (err: any) {
        console.error('Erro no webhook Asaas:', err);
        // 200 está OK quando você reconheceu o evento; mas quando há erro que precisa retry, retorne 500
        res.status(500).json({ ok: false, message: err?.message ?? 'Erro interno' });
    }
}