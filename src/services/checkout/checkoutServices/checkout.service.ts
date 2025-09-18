import prisma from '../../../prisma';
import { PlaceOrderInput } from './types';
import { ensureAsaasCustomerHasCpfCnpj } from './helpers';
import { listAddresses, createAddress, updateAddress, deleteAddress } from './address.service';
import { getPaymentOptions } from './paymentOptions';
import { calculateShippingCost } from './shipping.service';
import { createPaymentOnGateway } from './payment.service';
import { extractNormalizedFromRaw, persistPaymentOnDb } from './normalize.service';
import { createOrderTransaction } from './order.service';

export { listAddresses, createAddress, updateAddress, deleteAddress, getPaymentOptions };

export async function placeOrder(input: PlaceOrderInput) {

  const { cartId, promotion_id, customer_id, addressId, address, shippingId, paymentId, items, guestCustomer, shippingCost: shippingCostFromFrontend, shippingRaw, card, orderTotalOverride, promotionDetails: promotionDetailsFromFrontend } = input;

  // 1) carregar / criar customer
  let customer: any = null;
  if (customer_id) {
    customer = await prisma.customer.findUnique({ where: { id: customer_id } });
    if (!customer) throw new Error('Cliente não encontrado');
  } else {
    if (!guestCustomer || !guestCustomer.name) throw new Error('Dados do cliente visitante obrigatórios');
    try {
      customer = await prisma.customer.create({/* @ts-ignore */
        data: {
          name: guestCustomer.name,
          email: guestCustomer.email ?? `guest+${Date.now()}@example.com`,
          password: Math.random().toString(36).slice(2, 10),
          phone: guestCustomer.phone ?? '',
          cpf: guestCustomer.cpf ?? undefined,
          cnpj: guestCustomer.cnpj ?? undefined,
        },
      });
    } catch (err: any) {
      throw new Error(`Falha ao criar cliente visitante: ${err?.message ?? String(err)}`);
    }
  }

  // 1.1) garantir cpf/cnpj no Asaas
  try {
    await ensureAsaasCustomerHasCpfCnpj(customer);
  } catch (err: any) {
    throw new Error(err?.message ?? 'Não foi possível garantir CPF/CNPJ no Asaas para este cliente');
  }

  // 2) subtotal
  let subtotal = 0;
  for (const it of items) {
    let priceNum = Number(it.price ?? 0);
    if (!priceNum || priceNum <= 0) {
      const product = await prisma.product.findUnique({ where: { id: it.product_id } });
      if (!product) throw new Error(`Produto ${it.product_id} não encontrado`);
      priceNum = Number(product.price_per ?? 0);
    }
    subtotal += priceNum * (it.quantity ?? 1);
  }

  // 3) shippingCost
  const shippingCost = await calculateShippingCost({ shippingCostFromFrontend, shippingRaw, addressId, address, items });

  // 4) grand total
  const computedGrand = subtotal + (shippingCost ?? 0);
  const finalGrandTotal = (typeof orderTotalOverride === 'number' && !isNaN(orderTotalOverride)) ? Number(orderTotalOverride) : Number(computedGrand);

  // ----------------------------
  // NOVO: normalizar promotionDetails (se vier do frontend)
  // Esperamos um array de { id: string, discountApplied: number } ou algo semelhante.
  // Fazemos normalização e validação leve aqui antes de repassar para createOrderTransaction.
  // ----------------------------
  let normalizedPromotionDetails: Array<{ id: string; discountApplied: number }> | undefined = undefined;
  try {
    if (Array.isArray(promotionDetailsFromFrontend) && promotionDetailsFromFrontend.length > 0) {
      normalizedPromotionDetails = promotionDetailsFromFrontend
        .map((p: any) => {
          // aceitar várias formas: { id, discountApplied } ou { promotion_id, discount } etc.
          const id = String(p?.id ?? p?.promotion_id ?? '').trim();
          if (!id) return null;
          const discountApplied = Number(p?.discountApplied ?? p?.discount ?? 0) || 0;
          return { id, discountApplied };
        })
        .filter(Boolean) as Array<{ id: string; discountApplied: number }>;
      if (normalizedPromotionDetails.length === 0) normalizedPromotionDetails = undefined;
    }
  } catch (err) {
    // se houver problema ao normalizar, deixamos undefined e seguimos (mas logamos)
    console.warn('Erro ao normalizar promotionDetailsFromFrontend:', err);
    normalizedPromotionDetails = undefined;
  }

  // Debug: log temporário para confirmar que os dados chegam aqui
  // Remova/neutralize esses logs em produção se quiser.
  if (normalizedPromotionDetails) {
    console.log('placeOrder -> normalizedPromotionDetails:', normalizedPromotionDetails);
  } else if (promotionDetailsFromFrontend) {
    console.log('placeOrder -> promotionDetailsFromFrontend presente mas não normalizou para um array válido:', promotionDetailsFromFrontend);
  }

  // 5) criar pedido (transaction)
  // Agora passamos também promotionDetails para createOrderTransaction para que sejam criadas PromotionUsage e atualizados contadores.
  const createdOrder = await createOrderTransaction({
    cartId,
    promotion_id,
    items,
    subtotal,
    shippingCost: shippingCost ?? 0,
    finalGrandTotal,
    addressId,
    address,
    shippingRaw,
    shippingId,
    customer,
    promotionDetails: normalizedPromotionDetails, // <-- NOVO
  });

  // 6) criar cobrança no gateway
  const orderRefForGateway = (createdOrder as any).id_order_store ?? createdOrder.id;
  let gatewayResult: { billingType: string; paymentResult: any };
  try {
    gatewayResult = await createPaymentOnGateway({ customer, card, paymentId, finalGrandTotal, orderRefForGateway });
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await prisma.payment.create({
      data: {
        amount: finalGrandTotal,
        method: String(paymentId ?? 'UNKNOWN') as any,
        status: 'FAILED',
        transaction_id: null,
        asaas_customer_id: customer.asaas_customer_id ?? null,
        asaas_payment_id: null,
        description: String(errMsg).slice(0, 255),
        gateway_response: { error: String(errMsg) } as any,
        order: { connect: { id: createdOrder.id } },
        customer: { connect: { id: customer.id } },
      },
    });
    throw new Error(`Falha ao criar cobrança no gateway: ${errMsg}`);
  }

  // 7) normalizar/persistir payment
  const { billingType, paymentResult } = gatewayResult;
  const normalizedFields = extractNormalizedFromRaw(paymentResult);

  let originalInstallmentPlan: any = undefined;
  try {
    if (card) {
      // se frontend já enviou objeto explícito (preferência máxima)
      if (card.installment_plan && typeof card.installment_plan === 'object') {
        originalInstallmentPlan = card.installment_plan;
      } else if (card.installmentPlan && typeof card.installmentPlan === 'object') {
        originalInstallmentPlan = card.installmentPlan;
      } else {
        // tentar compor a partir de campos individuais
        const maybeInst = card.installments ?? card.installment ?? card.qtdParcelas ?? null;
        const maybePer = (card as any).installment_value ?? (card as any).perInstallment ?? null;

        const nInst = Number(maybeInst);
        const nPer = Number(maybePer);

        if (Number.isFinite(nInst) && Number.isFinite(nPer)) {
          originalInstallmentPlan = { installments: nInst, value: Number(nPer) };
        } else if (Number.isFinite(nInst)) {
          // só veio número de parcelas -> calcular valor aproximado dividindo o total
          const perCalc = Number((finalGrandTotal / nInst).toFixed(2));
          originalInstallmentPlan = { installments: nInst, value: perCalc };
        } else if (typeof maybeInst === 'string' && /^\d+$/.test(maybeInst)) {
          // string numérica -> coerção segura
          const n = Number(maybeInst);
          const perCalc = Number((finalGrandTotal / n).toFixed(2));
          originalInstallmentPlan = { installments: n, value: perCalc };
        } else {
          // nada válido vindo do card para parcelamento
          originalInstallmentPlan = undefined;
        }
      }
    }
  } catch (err) {
    console.warn('placeOrder -> erro ao construir originalInstallmentPlan:', err);
    originalInstallmentPlan = undefined;
  }

  if (originalInstallmentPlan) {
    // log temporário para verificação em staging; remova em produção
    console.log('placeOrder -> originalInstallmentPlan:', originalInstallmentPlan);
  }

  const persistedPayment = await persistPaymentOnDb({
    finalGrandTotal,
    billingType,
    paymentResult,
    normalizedFields,
    orderId: createdOrder.id,
    customerId: customer.id,
    originalInstallmentPlan
  });

  // 8) buscar o pedido completo (items + payments + customer) e retornar para frontend
  const full = await prisma.order.findUnique({ where: { id: createdOrder.id }, include: { items: true, payment: true, customer: true } as any });
  const paymentsFromDb = await prisma.payment.findMany({ where: { order_id: createdOrder.id }, orderBy: { created_at: 'asc' } as any });
  const itemsFromDb = await prisma.orderItem.findMany({ where: { order_id: createdOrder.id } });

  const normalized = {
    id: createdOrder.id,
    id_order_store: (createdOrder as any).id_order_store ?? null,
    total: Number(createdOrder.total ?? subtotal),
    shippingCost: Number(createdOrder.shippingCost ?? shippingCost ?? 0),
    grandTotal: Number(createdOrder.grandTotal ?? finalGrandTotal),
    address_id: createdOrder.address_id ?? (address ? `${address.street}, ${address.number ?? ''}` : null),
    shippingMethod: createdOrder.shippingMethod ?? String(shippingId),
    customer: customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, cpf: customer.cpf, asaas_customer_id: customer.asaas_customer_id ?? null } : null,
    items: itemsFromDb.map((it: any) => ({ id: it.id, product_id: it.product_id, price: Number(it.price ?? 0), quantity: Number(it.quantity ?? 0) })),
    payments: paymentsFromDb.map((p: any) => ({ id: p.id, amount: Number(p.amount ?? 0), method: p.method, status: p.status, transaction_id: p.transaction_id ?? null, asaas_payment_id: p.asaas_payment_id ?? null, boleto_url: p.boleto_url ?? null, boleto_barcode: p.boleto_barcode ?? null, pix_qr_code: p.pix_qr_code ?? null, pix_expiration: p.pix_expiration ?? null, gateway_response: p.gateway_response ?? null, created_at: p.created_at ?? null })),
    created_at: full?.created_at ?? new Date().toISOString(),
    raw: full ?? null,
  };

  const raw = paymentResult.raw ?? paymentResult;
  const paymentData = {
    boleto_url: normalizedFields.normalizedBoletoUrl ?? null,
    boleto_barcode: normalizedFields.normalizedBoletoBarcode ?? null,
    pix_qr: normalizedFields.normalizedPixQr ?? null,
    pix_payload: raw?.pixPayload ?? raw?.pix_payload ?? null as any,/* @ts-ignore */
    pix_qr_image: (persistedPayment?.gateway_response?.pix_qr_image) ?? null,
    pix_qr_url: paymentResult.pix_qr_url ?? raw?.pixQrCodeUrl ?? raw?.pix_qr_url ?? null,
    pix_expiration: normalizedFields.normalizedPixExpiration ?? null,
    checkoutUrl: paymentResult.checkoutUrl ?? raw?.checkoutUrl ?? null,
    raw,
    status: paymentResult.status ?? 'PENDING',
    id: paymentResult.id ?? null,
    amount: finalGrandTotal,
  };

  // 9) remover AbandonedCart
  try {
    if (cartId) {
      await prisma.abandonedCart.deleteMany({ where: { cart_id: cartId } });
    }
  } catch (err) {
    console.warn('Não foi possível remover AbandonedCart:', err);
  }

  return {
    success: true,
    orderId: String(createdOrder.id),
    orderData: normalized,
    paymentData,
    appliedPromotions: (createdOrder as any).appliedPromotions ?? [],
    skippedPromotions: (createdOrder as any).skippedPromotions ?? [],
  };
}
