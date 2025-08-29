import { Request, Response } from 'express';
import * as EmailService from '../../services/emails/email.service';

export async function sendAbandonedReminder(req: Request, res: Response) {
  try {
    const cartIdParam = req.params.cartId as string | undefined;
    const template_id = req.body?.template_id ?? null;

    // customer id injetado pelo middleware; se não existir, aceitamos header interno
    const customerId = (req as any).customer_id as string | undefined;
    const internalToken = (req.headers['x-internal-token'] as string) ?? undefined;
    const allowedInternal = !!(process.env.INTERNAL_API_TOKEN && internalToken && process.env.INTERNAL_API_TOKEN === internalToken);

    if (!cartIdParam) {
      res.status(400).json({ ok: false, message: 'cartId obrigatório no path' });
    }

    // log para debug (remova em produção)
    console.log('[sendAbandonedReminder] cartIdParam=', cartIdParam, ' customerId=', customerId, ' template_id=', template_id, 'internalAllowed=', !!allowedInternal);

    // Se não houver customerId e não for internal job, rejeitar
    if (!customerId && !allowedInternal) {
      res.status(401).json({ ok: false, message: 'Unauthorized: token ausente' });
    }

    // chama o serviço (ele valida propriedade se customerId for informado)
    const reminder = await EmailService.createEmailReminderForCart({/* @ts-ignore */
      cartId: cartIdParam,
      template_id: template_id ?? undefined,
      customerId: customerId ?? undefined,
    });

    res.status(200).json({ ok: true, reminder });
  } catch (err: any) {
    console.error('[email.controller] sendAbandonedReminder error', err);
    const status = err?.status ?? 400;
    res.status(status).json({ ok: false, message: err?.message ?? 'Erro ao criar reminder' });
  }
}