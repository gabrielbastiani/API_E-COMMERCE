import prisma from '../../../prisma';
import { createEmailReminderForCart } from '../../emails/email.service';

// Cache para eventos processados recentemente
const processedEventsCache = new Map();
const CACHE_TTL = 300000; // 5 minutos

export async function processAsaasWebhook(payload: any) {
  const eventId = payload?.id;

  if (!eventId) {
    console.error('Webhook sem ID de evento');
    return;
  }

  // Verificação rápida de cache
  const cacheKey = `event_${eventId}`;
  if (processedEventsCache.has(cacheKey)) {
    console.log(`Evento ${eventId} já processado recentemente (cache)`);
    return;
  }

  try {
    // Processamento RÁPIDO do webhook (foco no essencial)
    const payment = payload.payment || payload;
    const paymentId = payment.id;
    const status = payment.status ? String(payment.status).toUpperCase() : null;
    const externalReference = payment.externalReference;

    // 1. Registrar webhook (operação rápida)
    const webhookRecord = await prisma.paymentWebhook.create({
      data: {
        event: eventId,
        type: payload.event,
        payload: payload,
        asaas_payment_id: paymentId || null,
        processed: false,
        attempts: 1
      }
    });

    // 2. Buscar/atualizar payment de forma otimizada
    await processPaymentUpdate(payment, status, externalReference);

    // 3. Marcar como processado
    await prisma.paymentWebhook.update({
      where: { id: webhookRecord.id },
      data: { processed: true }
    });

    // 4. Adicionar ao cache
    processedEventsCache.set(cacheKey, true);
    setTimeout(() => processedEventsCache.delete(cacheKey), CACHE_TTL);

    // 5. Processar regras de negócio em background separado
    setTimeout(() => {
      processBusinessRules(payload, status).catch(error => {
        console.error('Erro nas regras de negócio:', error);
      });
    }, 0);

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
  }
}

// Função otimizada para atualização de payment
async function processPaymentUpdate(payment: any, status: string | null, externalReference: string | null) {
  const paymentId = payment.id;

  if (!paymentId) return;

  // Tentar encontrar payment existente
  const existingPayment = await prisma.payment.findFirst({
    where: {
      OR: [
        { asaas_payment_id: paymentId },
        { transaction_id: paymentId },
      ],
    },
    select: { id: true, gateway_response: true } // Apenas campos necessários
  });

  if (existingPayment) {
    // Atualizar payment existente
    const updatedGateway = {
      ...(existingPayment.gateway_response as object || {}),
      asaas_webhook_received_at: new Date().toISOString(),
      asaas_webhook_event: payment.event,
      asaas_webhook_payload: payment
    };

    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: status as any,
        gateway_response: updatedGateway
      }
    });
  } else if (externalReference) {
    // Criar novo payment apenas se tiver externalReference
    try {
      const orderExists = await prisma.order.findUnique({
        where: { id: String(externalReference) },
        select: { id: true } // Apenas verificar existência
      });

      if (orderExists) {
        await prisma.payment.create({
          data: {
            amount: Number(payment.value || payment.amount || 0),
            method: 'ASAAS' as any,
            status: (status || 'PENDING') as any,
            transaction_id: paymentId,
            asaas_payment_id: paymentId,
            gateway_response: {
              asaas_webhook_received_at: new Date().toISOString(),
              asaas_webhook_event: payment.event,
              asaas_webhook_payload: payment
            },
            order_id: String(externalReference),
            asaas_customer_id: payment.customer || null,
          } as any
        });
      }
    } catch (err) {
      console.warn('Erro ao criar payment:', err);
    }
  }
}

// Processar regras de negócio em separado (não crítico para resposta)
async function processBusinessRules(payload: any, status: string | null) {
  const payment = payload.payment || payload;

  try {
    // 1. Remover abandoned carts para pagamentos confirmados
    const confirmedStatuses = ['CONFIRMED', 'PAID', 'RECEIVED'];
    if (status && confirmedStatuses.includes(status)) {
      const possibleCartId = payment.cartId || payment.cart_id;
      if (possibleCartId) {
        await prisma.abandonedCart.deleteMany({
          where: { cart_id: String(possibleCartId) }
        });
      }
    }

    // 2. Criar lembretes para status específicos
    const reminderStatuses = ['PAYMENT_OVERDUE', 'PENDING', 'AWAITING_CHECKOUT_RISK_ANALYSIS_REQUEST'];
    if (status && reminderStatuses.includes(status)) {
      const asaasCustomerId = payment.customer;
      if (asaasCustomerId) {
        const customer = await prisma.customer.findFirst({
          where: { asaas_customer_id: String(asaasCustomerId) },
          select: { id: true } // Apenas ID necessário
        });

        if (customer) {
          const abandonedCart = await prisma.abandonedCart.findFirst({
            where: { customer_id: customer.id },
            orderBy: { abandonedAt: 'desc' } as any
          });

          if (abandonedCart) {
            await createEmailReminderForCart({
              cartId: abandonedCart.cart_id,
              customerId: abandonedCart.customer_id,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro nas regras de negócio:', error);
  }
}