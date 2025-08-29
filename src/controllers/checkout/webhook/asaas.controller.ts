import { Request, Response } from 'express';
import crypto from 'crypto';
import { processAsaasWebhook } from '../../../services/checkout/webhook/asaas.service'; 

export async function handleAsaasWebhook(req: Request, res: Response) {
  try {
    // Responder IMEDIATAMENTE (evitar timeouts do provedor)
    res.status(200).send('ok');

    // Processamento em background (não bloqueante)
    setImmediate(async () => {
      try {
        const signatureHeader = (req.headers['asaas-signature'] || req.headers['Asaas-Signature'] || req.headers['x-asaas-signature']) as string | undefined;
        const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;

        // Se houver secret e header, valide; caso contrário log e prossiga (config dev)
        if (webhookSecret && signatureHeader) {
          const raw = req.rawBody;
          if (!raw) {
            console.error('Raw body ausente para verificação de assinatura.');
            return;
          }

          // Asaas usa HMAC-SHA256; docs podem especificar hex ou base64.
          // Usamos hex por padrão; se sua conta retornar base64, troque para 'base64'.
          const computedHex = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');

          if (computedHex !== signatureHeader) {
            // Tenta também comparar base64 (por precaução)
            const computedBase64 = crypto.createHmac('sha256', webhookSecret).update(raw).digest('base64');
            if (computedBase64 !== signatureHeader) {
              console.error('Assinatura do webhook inválida. computedHex:', computedHex, 'computedBase64:', computedBase64, 'received:', signatureHeader);
              return;
            } else {
              console.warn('Assinatura aceita via base64 (recebida em base64).');
            }
          }
        } else {
          console.warn('Webhook secret ou signature header não fornecido — pulando verificação de assinatura.');
        }

        // Parse do payload: use req.body se já estiver parseado, senão parse do raw
        let payload: any = req.body;
        if ((!payload || Object.keys(payload).length === 0) && req.rawBody) {
          try {
            payload = JSON.parse(req.rawBody.toString('utf8'));
          } catch (err) {
            console.error('Falha ao parsear payload do webhook a partir do rawBody:', err);
            return;
          }
        }

        // Chama o processor principal (suas lógicas rápidas dentro dele)
        await processAsaasWebhook(payload);
      } catch (err) {
        console.error('Erro ao processar webhook em background:', err);
      }
    });

  } catch (err) {
    console.error('Erro no handler do webhook:', err);
    if (!res.headersSent) {
      res.status(500).send('internal_error');
    }
  }
}