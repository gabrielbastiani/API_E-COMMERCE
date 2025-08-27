import prisma from '../../prisma';

type ProcessInput = {
    payload: any;
    headerToken?: string | undefined;
};

type AsaasPaymentObj = any;

/**
 * Mapeia status/textos do Asaas para PaymentStatus do seu schema (PaymentStatus enum).
 * Ajuste caso sua integração precise mapping diferente.
 */
function mapAsaasStatusToPaymentStatus(event: string | undefined, asaasPayment?: AsaasPaymentObj) {
    // asaasPayment?.status pode vir com textos como "RECEIVED", "CONFIRMED", "OVERDUE", "REFUNDED", "PENDING", "FAILED"
    const s = (asaasPayment?.status ?? '').toString().toUpperCase();

    if (event === 'PAYMENT_RECEIVED') return 'RECEIVED';
    if (event === 'PAYMENT_CONFIRMED') return 'CONFIRMED';
    if (event === 'PAYMENT_OVERDUE') return 'OVERDUE';
    if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_REVERSED') return 'REFUNDED';
    if (event === 'PAYMENT_CREATED') return 'PENDING';
    if (event === 'PAYMENT_FAILED' || s === 'FAILED') return 'FAILED';

    // fallback baseado em payment.status do payload
    if (s === 'RECEIVED' || s === 'PAID') return 'RECEIVED';
    if (s === 'CONFIRMED' || s === 'COMPLETED') return 'CONFIRMED';
    if (s === 'OVERDUE') return 'OVERDUE';
    if (s === 'REFUNDED' || s === 'REVERSED') return 'REFUNDED';
    if (s === 'PENDING') return 'PENDING';

    return null;
}

/**
 * Atualiza registro Payment e, se apropriado, Order.status.
 */
async function updatePaymentAndOrder(asaasPayment: AsaasPaymentObj, event: string | undefined) {
    if (!asaasPayment) return;

    // Asaas payment id examples: "pay_XXXXXXXX"
    const asaasId = asaasPayment.id ?? asaasPayment.paymentId ?? asaasPayment.payment_id ?? null;
    if (!asaasId) {
        console.warn('Webhook sem asaas payment id:', asaasPayment);
        return;
    }

    // tenta localizar o payment no DB pelo campo asaas_payment_id OU transaction_id
    const payment = await prisma.payment.findFirst({
        where: {
            OR: [
                { asaas_payment_id: asaasId },
                { transaction_id: asaasId },
            ],
        },
    });

    // mapeia novo status
    const mappedStatus = mapAsaasStatusToPaymentStatus(event, asaasPayment);

    // Dados a atualizar no payment
    const updateData: any = {
        gateway_response: asaasPayment,
        updated_at: new Date(),
    };

    // atualize campos específicos retornados pela Asaas
    if (typeof asaasPayment.value !== 'undefined') updateData.amount = Number(asaasPayment.value ?? asaasPayment.amount ?? updateData.amount ?? 0);
    if (asaasPayment.pixQrCode || asaasPayment.qrCode || asaasPayment.pixPayload) updateData.pix_qr_code = asaasPayment.pixQrCode ?? asaasPayment.qrCode ?? asaasPayment.pixPayload;
    if (asaasPayment.pixDueDate || asaasPayment.pix_expiration) {
        const d = asaasPayment.pixDueDate ?? asaasPayment.pix_expiration;
        try { updateData.pix_expiration = d ? new Date(d) : null; } catch { }
    }
    if (asaasPayment.invoiceUrl || asaasPayment.bankSlipUrl || asaasPayment.boletoUrl) updateData.boleto_url = asaasPayment.invoiceUrl ?? asaasPayment.bankSlipUrl ?? asaasPayment.boletoUrl;
    if (asaasPayment.line || asaasPayment.barcode || asaasPayment.boletoBarCode) updateData.boleto_barcode = asaasPayment.line ?? asaasPayment.barcode ?? asaasPayment.boletoBarCode;
    if (asaasPayment.installments) updateData.installment_plan = { installments: asaasPayment.installments };

    // status mapping
    if (mappedStatus) updateData.status = mappedStatus;

    if (payment) {
        // atualiza payment existente
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                ...updateData,
                asaas_payment_id: asaasId,
                asaas_customer_id: asaasPayment.customer ?? payment.asaas_customer_id ?? undefined,
                transaction_id: payment.transaction_id ?? asaasId,
            },
        });

        // se status indica pagamento recebido/confirmado, atualizar pedido (order) associado
        if (mappedStatus === 'RECEIVED' || mappedStatus === 'CONFIRMED') {
            // encontra o order apontado pela payment.order_id (Payment.order is relation)
            try {
                // atualiza status do payment no banco (já feito). Atualiza Order.status para PROCESSING se estava PENDING
                const order = await prisma.order.findUnique({ where: { id: payment.order_id } });
                if (order && order.status === 'PENDING') {
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { status: 'PROCESSING' },
                    });
                }
            } catch (err) {
                console.warn('Erro ao atualizar order status após pagamento:', err);
            }
        }

        // mark processed done (handled by PaymentWebhook entry in caller)
        return;
    } else {
        // Não achou payment correspondente: gravar um novo payment "soft" ou apenas logar.
        // Aqui vamos criar um registro Payment com order_id vazio (ouphan) — opcional.
        try {
            // se payload.contain externalReference, podemos tentar localizar order via externalReference
            const externalRef = asaasPayment.externalReference ?? asaasPayment.external_reference ?? null;
            let orderIdToConnect: string | null = null;
            if (externalRef) {
                const ord = await prisma.order.findUnique({ where: { id: String(externalRef) } }).catch(() => null);
                if (ord) orderIdToConnect = ord.id;
            }

            await prisma.payment.create({
                data: {
                    amount: Number(asaasPayment.value ?? asaasPayment.amount ?? 0),
                    method: (String(asaasPayment.paymentMethod ?? asaasPayment.billingType ?? '') || '').toUpperCase().includes('PIX') ? 'PIX' :
                        (String(asaasPayment.paymentMethod ?? asaasPayment.billingType ?? '') || '').toUpperCase().includes('BOLETO') ? 'BOLETO' :
                            (String(asaasPayment.paymentMethod ?? asaasPayment.billingType ?? '') || '').toUpperCase().includes('CARD') ? 'CREDIT_CARD' : 'BOLETO',
                    status: mappedStatus ?? 'PENDING',
                    transaction_id: asaasId,
                    asaas_customer_id: asaasPayment.customer ?? undefined,
                    asaas_payment_id: asaasId,
                    description: asaasPayment.description ?? undefined,
                    pix_qr_code: asaasPayment.pixQrCode ?? asaasPayment.qrCode ?? asaasPayment.pixPayload ?? null,
                    pix_expiration: (asaasPayment.pixDueDate ? new Date(asaasPayment.pixDueDate) : (asaasPayment.pix_expiration ? new Date(asaasPayment.pix_expiration) : null)),
                    boleto_url: asaasPayment.invoiceUrl ?? asaasPayment.bankSlipUrl ?? null,
                    boleto_barcode: asaasPayment.line ?? asaasPayment.barcode ?? asaasPayment.boletoBarCode ?? null,
                    gateway_response: asaasPayment,
                    order: orderIdToConnect ? { connect: { id: orderIdToConnect } } : undefined,
                    customer: orderIdToConnect ? undefined : undefined, // no best info to link customer
                } as any,
            });
        } catch (err) {
            console.warn('Erro ao criar payment fallback no DB para webhook:', err);
        }
    }
}

/**
 * Processa o webhook recebido do Asaas:
 * - valida header token (se configurado);
 * - registra evento em PaymentWebhook (idempotência);
 * - chama updatePaymentAndOrder.
 */
export async function processWebhook(input: ProcessInput) {
    const { payload, headerToken } = input;

    // valida token se configurado
    const configuredToken = process.env.ASAAS_WEBHOOK_TOKEN ?? process.env.ASAAS_ACCESS_TOKEN ?? undefined;
    if (configuredToken) {
        if (!headerToken || headerToken !== configuredToken) {
            throw new Error('Webhook token inválido ou ausente');
        }
    }

    // payload mínimo esperado: { id: 'evt_xxx', event: 'PAYMENT_RECEIVED', payment: { ... } }
    const eventId: string | undefined = payload?.id ?? undefined;
    const eventName: string | undefined = payload?.event ?? payload?.type ?? undefined;
    const paymentObj: AsaasPaymentObj | undefined = payload?.payment ?? payload?.payment ?? payload?.data ?? undefined;

    // idempotência — se tivermos um PaymentWebhook com asaas_payment_id+event já processado, devolve sem reprocessar
    const asaasPaymentId = paymentObj?.id ?? paymentObj?.paymentId ?? paymentObj?.transactionId ?? null;

    // Try to detect duplicate by event id (payload.id) OR by asaasPaymentId+event
    if (eventId) {
        const existingEvt = await prisma.paymentWebhook.findUnique({ where: { id: eventId } }).catch(() => null);
        if (existingEvt) {
            // já processado (ou ao menos registrado)
            if (existingEvt.processed) {
                // idempotência: retorna sem erro
                return;
            }
            // se não processado, vamos reprocessar
        }
    }

    // criar registro de webhook (ou incrementar attempts)
    const webhookRecordData: any = {
        id: eventId ?? undefined, // se id do evento vier, usamos como PK (ou deixe o prisma gerar)
        event: String(eventName ?? 'UNKNOWN'),
        payload,
        asaas_payment_id: asaasPaymentId ?? '',
        processed: false,
        attempts: 0,
        created_at: new Date(),
    };

    // Upsert by eventId if given, else create
    let webhookRecord: any = null;
    if (eventId) {
        try {
            webhookRecord = await prisma.paymentWebhook.upsert({
                where: { id: eventId },
                create: webhookRecordData,
                update: { attempts: { increment: 1 }, payload, event: webhookRecordData.event, asaas_payment_id: webhookRecordData.asaas_payment_id },
            });
        } catch (err) {
            // fallback create (if upsert falhar por algum motivo)
            webhookRecord = await prisma.paymentWebhook.create({ data: { ...webhookRecordData } });
        }
    } else {
        // create new entry
        webhookRecord = await prisma.paymentWebhook.create({ data: { ...webhookRecordData } });
    }

    // agora chama a rotina que atualiza Payment / Order
    try {
        await updatePaymentAndOrder(paymentObj, eventName);
        // marca processed
        await prisma.paymentWebhook.update({ where: { id: webhookRecord.id }, data: { processed: true } });
    } catch (err: any) {
        // incrementa attempts e guarda erro
        await prisma.paymentWebhook.update({
            where: { id: webhookRecord.id },
            data: {
                attempts: (webhookRecord.attempts ?? 0) + 1,
                processed: false,
                payload: webhookRecord.payload, // mantém payload
            },
        });
        // lancar para que o controller retorne 500 — Asaas re-tentará
        throw err;
    }
}