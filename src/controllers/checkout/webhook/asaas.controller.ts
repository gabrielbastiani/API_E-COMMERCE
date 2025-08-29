import { Request, Response } from 'express';
import { processAsaasWebhook } from '../../../services/checkout/webhook/asaas.service';

// Cache para verificação de assinatura
const crypto = require('crypto');

export async function handleAsaasWebhook(req: Request, res: Response) {
  // 1. Responder IMEDIATAMENTE (dentro de 1-2 segundos)
  res.status(200).send('Webhook received - processing in background');
  
  // 2. Processar em background (não bloqueante)
  setTimeout(async () => {
    try {
      // Verificação de assinatura
      const signature = req.headers['asaas-signature'] as string;
      const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;

      if (webhookSecret && !verifySignature(req.body, signature, webhookSecret)) {
        console.error('Assinatura do webhook inválida');
        return;
      }

      // Processar o webhook
      await processAsaasWebhook(req.body);
    } catch (error) {
      console.error('Erro ao processar webhook em background:', error);
    }
  }, 100);

  console.time('webhook-response');
res.status(200).send('Webhook received - processing in background');
console.timeEnd('webhook-response');
}

// Função otimizada para verificação de assinatura
function verifySignature(body: any, signature: string, secret: string): boolean {
  try {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');
    return digest === signature;
  } catch (error) {
    console.error('Erro na verificação de assinatura:', error);
    return false;
  }
}