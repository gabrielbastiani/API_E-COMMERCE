import prisma from '../../../prisma';
import { createEmailReminderForCart } from '../../emails/email.service';
import { NotificationService } from '../../notification/notification.service';

// Cache para eventos processados recentemente
const processedEventsCache = new Map<string, boolean>();
const CACHE_TTL = 300000; // 5 minutos

type AsaasPayload = any;

export async function processAsaasWebhook(payload: AsaasPayload) {
  const eventId = payload?.id;
  if (!eventId) {
    console.error('Webhook sem ID de evento');
    return;
  }

  const cacheKey = `event_${eventId}`;
  if (processedEventsCache.has(cacheKey)) {
    console.log(`Evento ${eventId} já processado recentemente (cache)`);
    return;
  }

  try {
    // Processamento RÁPIDO do webhook (registro mínimo)
    const payment = payload.payment || payload;
    const paymentId = payment.id;
    const statusRaw = payment.status ? String(payment.status).toUpperCase() : null;
    const externalReference = payment.externalReference || null;

    // 1) Tenta inserir um registro em paymentWebhooks (idempotência)
    let webhookRecord;
    try {
      webhookRecord = await prisma.paymentWebhook.create({
        data: {
          event: eventId,
          type: payload.event || statusRaw || 'UNKNOWN',
          payload: payload,
          asaas_payment_id: paymentId || null,
          processed: false,
          attempts: 1
        }
      });
    } catch (err: any) {
      if (/(unique|already exists)/i.test(String(err?.message || ''))) {
        webhookRecord = await prisma.paymentWebhook.findUnique({ where: { event: eventId } });
        if (webhookRecord?.processed) {
          console.log('Evento já processado anteriormente:', eventId);
          processedEventsCache.set(cacheKey, true);
          setTimeout(() => processedEventsCache.delete(cacheKey), CACHE_TTL);
          return;
        }
        // increment attempts
        if (webhookRecord) {
          await prisma.paymentWebhook.update({
            where: { id: webhookRecord.id },
            data: { attempts: (webhookRecord.attempts || 0) + 1 }
          });
        }
      } else {
        throw err;
      }
    }

    // 2) Atualizações rápidas no Payment/Order (se aplicável)
    if (statusRaw === 'OVERDUE') {
      await handlePaymentOverdue(payment, externalReference);
    } else if (['RECEIVED', 'CONFIRMED', 'PAID', 'COMPLETED'].includes(statusRaw || '')) {
      await handlePaymentReceived(payment, externalReference);
    } else if (statusRaw === 'REFUNDED' || statusRaw === 'REVERSED') {
      await handlePaymentRefunded(payment, externalReference);
    } else {
      // Atualização genérica: salva gateway_response se payment existe
      await upsertPaymentGatewayResponse(payment);
    }

    // 3) Marca webhook como processado
    if (webhookRecord && !webhookRecord.processed) {
      await prisma.paymentWebhook.update({
        where: { id: webhookRecord.id },
        data: { processed: true }
      });
    }

    // 4) Cache para evitar reprocessamento imediato
    processedEventsCache.set(cacheKey, true);
    setTimeout(() => processedEventsCache.delete(cacheKey), CACHE_TTL);

    // 5) Processar regras de negócio não-críticas (em background)
    setTimeout(() => {
      processBusinessRules(payload, statusRaw).catch(error => {
        console.error('Erro nas regras de negócio:', error);
      });
    }, 0);

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    // increment attempts on failure if webhookRecord exists
    try {
      if (payload?.id) {
        const rec = await prisma.paymentWebhook.findUnique({ where: { event: payload.id } });
        if (rec) {
          await prisma.paymentWebhook.update({
            where: { id: rec.id },
            data: { attempts: (rec.attempts || 0) + 1 }
          });
        }
      }
    } catch (e) {
      console.error('Erro ao incrementar attempts do webhook:', e);
    }
  }
}

/* ----------------- Helpers ----------------- */

async function upsertPaymentGatewayResponse(payment: any) {
  try {
    if (!payment?.id) return;

    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [{ asaas_payment_id: payment.id }, { transaction_id: payment.id }]
      }
    });

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          gateway_response: {
            ...(existingPayment.gateway_response as object || {}),
            asaas_webhook_received_at: new Date().toISOString(),
            asaas_webhook_event: payment.event || null,
            asaas_webhook_payload: payment
          }
        }
      });
    }
  } catch (err) {
    console.error('upsertPaymentGatewayResponse error:', err);
  }
}

/**
 * Tratamento para pagamento recebido / confirmado
 */
async function handlePaymentReceived(payment: any, externalReference: string | null) {
  const paymentId = payment.id;
  if (!paymentId) return;

  try {
    // Tenta encontrar payment existente
    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [{ asaas_payment_id: paymentId }, { transaction_id: paymentId }]
      }
    });

    if (existingPayment) {
      // Atualiza payment e order e estoque em transação
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: 'RECEIVED',
            gateway_response: {
              ...(existingPayment.gateway_response as any || {}),
              asaas_webhook_received_at: new Date().toISOString(),
              asaas_webhook_event: payment.event,
              asaas_webhook_payload: payment
            }
          }
        });

        // Atualiza order status (se existir)
        try {
          await tx.order.update({
            where: { id: existingPayment.order_id },
            data: { status: 'PROCESSING' }
          });
        } catch (e: any) {
          console.warn('Não foi possível atualizar order.status para PROCESSING:', e?.message ?? e);
        }

        // Atualiza estoque (somente com product_id — seu OrderItem não tem variant_id no schema)
        try {
          const orderItems = await tx.orderItem.findMany({
            where: { order_id: existingPayment.order_id },
            select: { product_id: true, quantity: true }
          });

          for (const item of orderItems) {
            if (!item?.product_id) continue;
            // decrement com segurança (update falhará se produto não existir -> capturado)
            try {
              await tx.product.update({
                where: { id: item.product_id },
                data: { stock: { decrement: item.quantity || 0 } }
              });
            } catch (decrErr: any) {
              console.warn(`Falha ao decrementar estoque do produto ${item.product_id}:`, decrErr?.message ?? decrErr);
            }
          }
        } catch (e: any) {
          console.warn('Erro ao reduzir estoque (pode ser ok se nao usar reserva de estoque):', e?.message ?? e);
        }
      });

      // Notificações: cliente + admins
      try {
        const customerId = existingPayment.customer_id;
        await NotificationService.createForCustomer({
          customerId,
          type: 'ORDER',
          message: `Pagamento confirmado para pedido ${existingPayment.order_id}. Obrigado!`,
          link: `/orders/${existingPayment.order_id}`
        });

        const admins = await prisma.userEcommerce.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true }
        });

        for (const admin of admins) {
          await NotificationService.createForUser({
            userEcommerceId: admin.id,
            type: 'ORDER',
            message: `Pedido ${existingPayment.order_id} teve pagamento confirmado (payment ${paymentId}).`,
            link: `/admin/orders/${existingPayment.order_id}`
          });
        }
      } catch (e) {
        console.error('Erro ao criar notificacoes para pagamento recebido:', e);
      }

      return;
    }

    // Se payment não existe mas tem externalReference (order)
    if (externalReference) {
      const order = await prisma.order.findUnique({
        where: { id: externalReference }
      });

      if (order) {
        // cria payment e atualiza order/estoque transacionalmente
        await prisma.$transaction(async (tx) => {
          const createdPayment = await tx.payment.create({
            data: {
              amount: Number(payment.value || payment.amount || 0),
              method: mapBillingTypeToPaymentMethod(payment.billingType),
              status: 'RECEIVED',
              transaction_id: paymentId,
              asaas_payment_id: paymentId,
              gateway_response: {
                asaas_webhook_received_at: new Date().toISOString(),
                asaas_webhook_event: payment.event,
                asaas_webhook_payload: payment
              },
              order_id: order.id,
              customer_id: order.customer_id
            }
          });

          // Atualizar order
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'PROCESSING' }
          });

          // Reduzir estoque (apenas product_id, como seu schema define)
          const orderItems = await tx.orderItem.findMany({
            where: { order_id: order.id },
            select: { product_id: true, quantity: true }
          });

          for (const item of orderItems) {
            if (!item?.product_id) continue;
            try {
              await tx.product.update({
                where: { id: item.product_id },
                data: { stock: { decrement: item.quantity || 0 } }
              });
            } catch (decrErr: any) {
              console.warn(`Falha ao decrementar estoque do produto ${item.product_id} durante criação de payment:`, decrErr?.message ?? decrErr);
            }
          }
        });

        // Notificações (customer + admins)
        try {
          const customerId = order.customer_id;
          await NotificationService.createForCustomer({
            customerId,
            type: 'ORDER',
            message: `Pagamento recebido para pedido ${order.id}. Obrigado!`,
            link: `/orders/${order.id}`
          });

          const admins = await prisma.userEcommerce.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
            select: { id: true }
          });

          for (const admin of admins) {
            await NotificationService.createForUser({
              userEcommerceId: admin.id,
              type: 'ORDER',
              message: `Pedido ${order.id} pago (payment ${paymentId}).`,
              link: `/admin/orders/${order.id}`
            });
          }
        } catch (e) {
          console.error('Erro ao criar notificacoes apos criar payment:', e);
        }
      }
    }
  } catch (err) {
    console.error('handlePaymentReceived error:', err);
  }
}

/**
 * Tratamento para pagamento vencido / OVERDUE
 */
async function handlePaymentOverdue(payment: any, externalReference: string | null) {
  const paymentId = payment.id;
  try {
    const existingPayment = await prisma.payment.findFirst({
      where: { OR: [{ asaas_payment_id: paymentId }, { transaction_id: paymentId }] }
    });

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: 'OVERDUE',
          gateway_response: {
            ...(existingPayment.gateway_response as any || {}),
            asaas_webhook_received_at: new Date().toISOString(),
            asaas_webhook_event: payment.event,
            asaas_webhook_payload: payment
          }
        }
      });

      // Notificar cliente e admins
      try {
        await NotificationService.createForCustomer({
          customerId: existingPayment.customer_id,
          type: 'ORDER',
          message: `O pagamento do pedido ${existingPayment.order_id} está vencido. Acesse sua conta para opções de pagamento.`,
          link: `/orders/${existingPayment.order_id}`
        });

        const admins = await prisma.userEcommerce.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true }
        });

        for (const admin of admins) {
          await NotificationService.createForUser({
            userEcommerceId: admin.id,
            type: 'ORDER',
            message: `Pagamento vencido para pedido ${existingPayment.order_id} (payment ${paymentId}).`,
            link: `/admin/orders/${existingPayment.order_id}`
          });
        }
      } catch (e) {
        console.error('Erro ao criar notificacoes para overdue:', e);
      }

      // Abandoned cart / reminder
      try {
        const ord = await prisma.order.findUnique({ where: { id: existingPayment.order_id }, select: { cart_id: true } });
        if (ord?.cart_id) {
          const abandoned = await prisma.abandonedCart.findFirst({ where: { cart_id: ord.cart_id } });
          if (abandoned) {
            await prisma.$transaction([
              prisma.emailReminder.create({
                data: {
                  cart_id: abandoned.id,
                  template_id: null
                }
              }),
              prisma.abandonedCart.update({
                where: { id: abandoned.id },
                data: { reminderCount: { increment: 1 }, reminderSentAt: new Date() }
              })
            ]);
          }
        }
      } catch (e) {
        console.error('Erro ao criar emailReminder para overdue:', e);
      }

      return;
    }

    if (externalReference) {
      const order = await prisma.order.findUnique({ where: { id: externalReference } });
      if (order) {
        try {
          await NotificationService.createForCustomer({
            customerId: order.customer_id,
            type: 'ORDER',
            message: `Identificamos um pagamento vencido para o pedido ${order.id}. Verifique suas formas de pagamento.`,
            link: `/orders/${order.id}`
          });
        } catch (e) {
          console.error('Erro ao notificar customer para overdue (sem payment):', e);
        }
      }
    }
  } catch (err) {
    console.error('handlePaymentOverdue error:', err);
  }
}

/**
 * Tratamento para pagamento reembolsado
 */
async function handlePaymentRefunded(payment: any, externalReference: string | null) {
  const paymentId = payment.id;
  try {
    const existingPayment = await prisma.payment.findFirst({
      where: { OR: [{ asaas_payment_id: paymentId }, { transaction_id: paymentId }] }
    });

    if (existingPayment) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: 'REFUNDED',
            gateway_response: {
              ...(existingPayment.gateway_response as any || {}),
              asaas_webhook_received_at: new Date().toISOString(),
              asaas_webhook_event: payment.event,
              asaas_webhook_payload: payment
            }
          }
        });

        // Atualiza order: marca como CANCELLED (opcional conforme policy)
        try {
          await tx.order.update({
            where: { id: existingPayment.order_id },
            data: { status: 'CANCELLED' }
          });
        } catch (e: any) {
          console.warn('Não foi possível setar order.status para CANCELLED:', e?.message ?? e);
        }

        // Repor estoque apenas com product_id (schema atual)
        try {
          const orderItems = await tx.orderItem.findMany({
            where: { order_id: existingPayment.order_id },
            select: { product_id: true, quantity: true }
          });

          for (const item of orderItems) {
            if (!item?.product_id) continue;
            try {
              await tx.product.update({
                where: { id: item.product_id },
                data: { stock: { increment: item.quantity || 0 } }
              });
            } catch (incErr: any) {
              console.warn(`Falha ao repor estoque do produto ${item.product_id}:`, incErr?.message ?? incErr);
            }
          }
        } catch (e: any) {
          console.warn('Erro ao repor estoque durante refund:', e?.message ?? e);
        }
      });

      // Notificar cliente e admins
      try {
        await NotificationService.createForCustomer({
          customerId: existingPayment.customer_id,
          type: 'ORDER',
          message: `O pagamento do pedido ${existingPayment.order_id} foi reembolsado.`,
          link: `/orders/${existingPayment.order_id}`
        });

        const admins = await prisma.userEcommerce.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true }
        });

        for (const admin of admins) {
          await NotificationService.createForUser({
            userEcommerceId: admin.id,
            type: 'ORDER',
            message: `Pagamento do pedido ${existingPayment.order_id} foi reembolsado (payment ${paymentId}).`,
            link: `/admin/orders/${existingPayment.order_id}`
          });
        }
      } catch (e) {
        console.error('Erro ao notificar sobre refund:', e);
      }
    }
  } catch (err) {
    console.error('handlePaymentRefunded error:', err);
  }
}

/* -- Business rules não críticos (rodados em background) -- */
async function processBusinessRules(payload: any, status: string | null) {
  const payment = payload.payment || payload;

  try {
    const confirmedStatuses = ['CONFIRMED', 'RECEIVED', 'PAID', 'COMPLETED'];
    if (status && confirmedStatuses.includes(status)) {
      const possibleCartId = payment.cartId || payment.cart_id;
      if (possibleCartId) {
        await prisma.abandonedCart.deleteMany({
          where: { cart_id: String(possibleCartId) }
        });
      }
    }

    const reminderStatuses = ['OVERDUE', 'PENDING', 'AWAITING_CHECKOUT_RISK_ANALYSIS_REQUEST'];
    if (status && reminderStatuses.includes(status)) {
      const asaasCustomerId = payment.customer;
      if (asaasCustomerId) {
        const customer = await prisma.customer.findFirst({
          where: { asaas_customer_id: String(asaasCustomerId) },
          select: { id: true }
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
    console.error('Erro nas regras de negócio (background):', error);
  }
}

/* ---------------- util ------------------ */
function mapBillingTypeToPaymentMethod(billingType: string | null | undefined) {
  if (!billingType) return 'PIX';
  const bt = String(billingType).toUpperCase();
  if (bt.includes('BOLETO')) return 'BOLETO';
  if (bt.includes('CREDIT')) return 'CREDIT_CARD';
  if (bt.includes('DEBIT')) return 'DEBIT_CARD';
  if (bt.includes('PIX')) return 'PIX';
  if (bt.includes('TRANSFER')) return 'BANK_TRANSFER';
  return 'PIX';
}