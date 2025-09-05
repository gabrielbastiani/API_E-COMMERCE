import prisma from '../../prisma';
import * as AsaasClient from './asaas.client';
import * as MelhorEnvioClient from './melhorenvio.client';

type AddressPayload = {
  recipient_name?: string;
  street: string;
  number?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  zipCode: string;
  country?: string | null;
  complement?: string | null;
  reference?: string | null;
};

type CardPayload = {
  number: string;
  holderName: string;
  expirationMonth: string | number;
  expirationYear: string | number;
  cvv: string;
  installments?: number | null;
  brand?: string | null;
};

type PlaceOrderInput = {
  cartId?: string | null;
  customer_id?: string | undefined;
  addressId?: string | null;
  address?: AddressPayload | null;
  shippingId: string;
  paymentId: string;
  items: Array<{ product_id: string; price?: number; quantity?: number; weight?: number; length?: number; height?: number; width?: number; variant_id?: string | null }>;
  guestCustomer?: { name?: string; email?: string; phone?: string; cpf?: string; cnpj?: string };
  customerNote?: string;
  shippingCost?: number | null;
  shippingRaw?: any | null;
  couponCode?: string | null;
  card?: CardPayload | null;
  orderTotalOverride?: number | null;
};

/* --- utilitárias de endereço (mantidas) --- */
export async function listAddresses(customerId: string) {
  if (!customerId) throw new Error('customer_id obrigatório');
  return prisma.address.findMany({ where: { customer_id: customerId }, orderBy: { created_at: 'desc' } as any });
}

export async function createAddress(customerId: string, payload: Partial<AddressPayload>) {
  if (!customerId) throw new Error('customer_id obrigatório');
  const data: any = {
    customer: { connect: { id: customerId } },
    recipient_name: payload.recipient_name ?? '',
    street: payload.street ?? '',
    city: payload.city ?? '',
    state: payload.state ?? '',
    zipCode: payload.zipCode ?? '',
    number: payload.number ?? '',
    neighborhood: payload.neighborhood ?? '',
    country: payload.country ?? 'Brasil',
    complement: payload.complement ?? null,
    reference: payload.reference ?? null,
  };
  return prisma.address.create({ data });
}

export async function updateAddress(customerId: string, addressId: string, payload: Partial<AddressPayload>) {
  if (!customerId) throw new Error('customer_id obrigatório');
  const existing = await prisma.address.findUnique({ where: { id: addressId } });
  if (!existing) throw new Error('Endereço não encontrado');
  if (existing.customer_id !== customerId) throw new Error('Não autorizado');
  const data: any = {
    recipient_name: payload.recipient_name ?? existing.recipient_name,
    street: payload.street ?? existing.street,
    city: payload.city ?? existing.city,
    state: payload.state ?? existing.state,
    zipCode: payload.zipCode ?? existing.zipCode,
    number: payload.number ?? existing.number,
    neighborhood: payload.neighborhood ?? existing.neighborhood,
    country: payload.country ?? existing.country,
    complement: payload.complement ?? existing.complement,
    reference: payload.reference ?? existing.reference,
  };
  return prisma.address.update({ where: { id: addressId }, data });
}

export async function deleteAddress(customerId: string, addressId: string) {
  if (!customerId) throw new Error('customer_id obrigatório');
  const existing = await prisma.address.findUnique({ where: { id: addressId } });
  if (!existing) throw new Error('Endereço não encontrado');
  if (existing.customer_id !== customerId) throw new Error('Não autorizado');
  await prisma.address.delete({ where: { id: addressId } });
  return true;
}

export async function getPaymentOptions() {
  return [
    { id: 'asaas-pix', provider: 'Asaas', method: 'PIX', label: 'PIX (pagamento instantâneo)', description: 'Pague via QR Code / Payload Pix' },
    { id: 'asaas-boleto', provider: 'Asaas', method: 'BOLETO', label: 'Boleto bancário', description: 'Pague com boleto' },
    { id: 'asaas-card', provider: 'Asaas', method: 'CARD', label: 'Cartão de crédito', description: 'Pague com cartão de crédito' },
  ];
}

/* --------------------------
   Helpers locais
   -------------------------- */

// sanitiza CPF/CNPJ (remove tudo que não for dígito); retorna undefined se vazio
function onlyDigits(str?: string | null) {
  if (str === undefined || str === null) return undefined;
  const s = String(str).replace(/\D/g, '');
  return s === '' ? undefined : s;
}

async function ensureAsaasCustomerHasCpfCnpj(customer: any) {
  if (!customer) throw new Error('Customer obrigatório para ensureAsaasCustomerHasCpfCnpj');

  const cpfOrCnpj = customer.cpf ?? customer.cnpj ?? null;
  const cpfCnpjSan = onlyDigits(cpfOrCnpj ?? undefined);

  // Se não há cpf/cnpj no cliente local -> não podemos garantir no Asaas
  if (!cpfCnpjSan) {
    // permitir comportamento: se cliente local realmente não possui cpf nem cnpj, não tentamos forçar no Asaas.
    // Porém, criar cobrança sem identificação falhará no gateway. Melhor falhar cedo.
    throw new Error('CPF ou CNPJ do cliente não informado. É necessário ter CPF ou CNPJ para criar cobrança na Asaas.');
  }

  // 1) Se não temos asaas_customer_id -> tentar criar com cpfCnpj
  if (!customer.asaas_customer_id) {
    try {
      const asaasCustomer = await AsaasClient.createCustomer({
        name: customer.name,
        email: customer.email ?? undefined,
        phone: customer.phone ?? undefined,
        cpfCnpj: cpfCnpjSan,
      });

      if (asaasCustomer?.id) {
        // Persistir no DB local
        await prisma.customer.update({ where: { id: customer.id }, data: { asaas_customer_id: asaasCustomer.id } });
        customer.asaas_customer_id = asaasCustomer.id;
        return;
      } else {
        throw new Error('Criação do cliente na Asaas não retornou id.');
      }
    } catch (err: any) {
      // repassa erro claro
      throw new Error(`Falha ao criar cliente na Asaas (necessário CPF/CNPJ): ${err?.message ?? String(err)}`);
    }
  }

  // 2) Se temos asaas_customer_id -> buscar e, se necessário, atualizar cpfCnpj
  if (customer.asaas_customer_id) {
    try {
      const asaasCust = await AsaasClient.getCustomer(customer.asaas_customer_id);
      // algumas versões do retorno usam cpfCnpj ou cpf_cnpj, tentamos pegar qualquer um
      const asaasCpfCnpj = asaasCust?.cpfCnpj ?? asaasCust?.cpf_cnpj ?? asaasCust?.cpf ?? asaasCust?.cnpj ?? null;
      if ((!asaasCpfCnpj || String(asaasCpfCnpj).trim() === '') && cpfCnpjSan) {
        // atualizar no Asaas
        try {
          await AsaasClient.updateCustomer(customer.asaas_customer_id, { cpfCnpj: cpfCnpjSan });
          return;
        } catch (err: any) {
          throw new Error(`Falha ao atualizar CPF/CNPJ do cliente no Asaas: ${err?.message ?? String(err)}`);
        }
      } else {
        // já tem cpfCnpj -> OK
        return;
      }
    } catch (err: any) {
      // Se não conseguimos buscar (ex.: customer não existe no Asaas), tentamos criar de novo
      try {
        const asaasCustomer = await AsaasClient.createCustomer({
          name: customer.name,
          email: customer.email ?? undefined,
          phone: customer.phone ?? undefined,
          cpfCnpj: cpfCnpjSan,
        });
        if (asaasCustomer?.id) {
          await prisma.customer.update({ where: { id: customer.id }, data: { asaas_customer_id: asaasCustomer.id } });
          customer.asaas_customer_id = asaasCustomer.id;
          return;
        } else {
          throw new Error('Criação alternativa do cliente na Asaas não retornou id.');
        }
      } catch (err2: any) {
        throw new Error(`Falha ao garantir CPF/CNPJ no Asaas para o cliente (id local: ${customer.id}): ${err2?.message ?? String(err2)}`);
      }
    }
  }
}

/**
 * placeOrder: cria pedido + cobrança e retorna objeto do pedido já normalizado
 * Retorna: { success: true, orderId, orderData, paymentData }
 */
export async function placeOrder(input: PlaceOrderInput) {
  const { cartId, customer_id, addressId, address, shippingId, paymentId, items, guestCustomer, shippingCost: shippingCostFromFrontend, shippingRaw, card, orderTotalOverride } = input;

  // --- 1) carregar / criar customer ---
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

  // --- 1.1) Garantir que o cliente no Asaas tenha CPF/CNPJ antes de criar cobrança ---
  try {
    await ensureAsaasCustomerHasCpfCnpj(customer);
  } catch (err: any) {
    // Interrompe o fluxo e retorna erro claro — evita erro de gateway invalid_customer.cpfCnpj
    throw new Error(err?.message ?? 'Não foi possível garantir CPF/CNPJ no Asaas para este cliente');
  }

  // --- 2) subtotal ---
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

  // --- 3) shippingCost: prioridade frontend ---
  let shippingCost: number | undefined = undefined;
  if (typeof shippingCostFromFrontend === 'number' && !isNaN(shippingCostFromFrontend)) {
    shippingCost = shippingCostFromFrontend;
  }

  if (shippingCost == null) {
    try {
      if (shippingRaw && typeof shippingRaw.price === 'number') {
        shippingCost = shippingRaw.price;
      } else {
        let destZip: string | undefined;
        if (addressId) {
          const a = await prisma.address.findUnique({ where: { id: addressId } });
          if (!a) throw new Error('Endereço não encontrado para cálculo de frete');
          destZip = a.zipCode?.replace(/\D/g, '');
        } else if (address) {
          destZip = address.zipCode?.replace(/\D/g, '');
        } else {
          throw new Error('shippingCost não informado e endereço não disponível para cálculo');
        }

        if (!process.env.ORIGIN_CEP) throw new Error('Origin ZIP not configured on server (ORIGIN_CEP)');

        const products = (items || []).map((it) => ({
          name: 'Produto',
          quantity: it.quantity ?? 1,
          price: Number(it.price ?? 0),
          weight: it.weight ?? 0.1,
          width: it.width ?? 10,
          height: it.height ?? 2,
          length: it.length ?? 10,
        }));

        const quoteArr = await MelhorEnvioClient.quote({ from: process.env.ORIGIN_CEP!, to: destZip!, products });
        const first = Array.isArray(quoteArr) && quoteArr.length > 0 ? quoteArr[0] : null;
        if (!first || first.total == null) {
          throw new Error('MelhorEnvio: preço inválido na cotação');
        }
        shippingCost = Number(first.total);
      }
    } catch (err: any) {
      throw new Error(`Não foi possível calcular/validar o frete no servidor: ${err?.message ?? String(err)}. Envie shippingCost no payload se o frete já foi calculado no frontend.`);
    }
  }

  // --- 4) calcular grandTotal (usar orderTotalOverride se fornecido) ---
  const computedGrand = subtotal + (shippingCost ?? 0);
  const finalGrandTotal = (typeof orderTotalOverride === 'number' && !isNaN(orderTotalOverride)) ? Number(orderTotalOverride) : Number(computedGrand);

  // --- 5) criar pedido (transaction) ---
  const createdOrder = await prisma.$transaction(async (tx) => {
    const addressText = addressId
      ? ((await tx.address.findUnique({ where: { id: addressId } }))?.street ?? '')
      : `${address?.street ?? ''}, ${address?.number ?? ''} - ${address?.city ?? ''}/${address?.state ?? ''} - ${address?.zipCode ?? ''}`;

    // ---------- gerar número sequencial (Postgres SEQUENCE) ----------
    let idOrderStore: string | null = null;
    try {
      const seqRows = (await tx.$queryRaw`SELECT nextval('order_store_seq') as val`) as Array<{ val: number | string }>;
      const seqNum = Number(seqRows?.[0]?.val ?? 0);
      const year = new Date().getFullYear();
      idOrderStore = `${year}-${String(seqNum).padStart(6, '0')}`;
    } catch (err: any) {
      throw new Error("Falha ao gerar número sequencial 'order_store_seq'. Execute a migration que cria a sequence (CREATE SEQUENCE order_store_seq) e tente novamente. Detalhe: " + (err?.message ?? String(err)));
    }

    // ---------- criar o pedido já com id_order_store setado ----------
    const created = await tx.order.create({
      data: {
        total: subtotal,
        shippingCost: shippingCost ?? 0,
        grandTotal: finalGrandTotal,
        shippingAddress: addressText,
        shippingMethod: shippingRaw ? (shippingRaw.provider ?? shippingRaw.carrier ?? String(shippingId)) : String(shippingId),
        customer: { connect: { id: customer.id } },
        cart_id: cartId ?? undefined,
        id_order_store: idOrderStore,
      },
    });

    for (const it of items) {
      await tx.orderItem.create({
        data: {
          order_id: created.id,
          product_id: it.product_id,
          price: it.price ?? 0,
          quantity: it.quantity ?? 1,
        },
      });

      try {
        await tx.product.update({ where: { id: it.product_id }, data: { stock: { decrement: it.quantity ?? 0 } } });
      } catch {
        // ignore stock errors
      }
    }

    return created;
  });

  // --- 6) criar cobrança na Asaas ---
  const billingType = String(paymentId ?? '').toLowerCase().includes('pix')
    ? 'PIX'
    : String(paymentId ?? '').toLowerCase().includes('boleto')
      ? 'BOLETO'
      : String(paymentId ?? '').toLowerCase().includes('card')
        ? 'CREDIT_CARD'
        : 'BOLETO';

  // Use id_order_store legível quando disponível
  const orderRefForGateway = (createdOrder as any).id_order_store ?? createdOrder.id;

  let paymentResult: any;
  try {
    if (billingType === 'CREDIT_CARD' && card) {
      let tokenResp: any = null;
      try {
        tokenResp = await AsaasClient.tokenizeCard({
          customerAsaasId: customer.asaas_customer_id ?? undefined,
          cardNumber: card.number.replace(/\s+/g, ''),
          holderName: card.holderName,
          expirationMonth: String(card.expirationMonth).padStart(2, '0'),
          expirationYear: String(card.expirationYear),
          cvv: card.cvv,
        });
      } catch (err) {
        console.warn('Tokenização falhou:', err instanceof Error ? err.message : err);
        throw new Error('Falha na tokenização do cartão. Verifique os dados do cartão.');
      }

      const maybeToken = tokenResp?.creditCardToken || tokenResp?.token || tokenResp?.id;
      if (!maybeToken) {
        throw new Error('Token de cartão não retornado pela Asaas. Verifique resposta: ' + JSON.stringify(tokenResp));
      }

      // Aqui usamos finalGrandTotal (que pode vir do orderTotalOverride enviado pelo frontend)
      paymentResult = await AsaasClient.createPayment({
        customer_asaaS_id: customer.asaas_customer_id ?? undefined,
        amount: finalGrandTotal,
        billingType: 'CREDIT_CARD',
        description: `Pedido ${orderRefForGateway}`,
        externalReference: String(orderRefForGateway),
        creditCardToken: maybeToken,
        creditCardHolderName: card.holderName,
        installments: card.installments ?? 1,
      });
    } else {
      // PIX / BOLETO / etc. também usam finalGrandTotal
      paymentResult = await AsaasClient.createPayment({
        customer_asaaS_id: customer.asaas_customer_id ?? undefined,
        amount: finalGrandTotal,
        billingType: billingType as any,
        description: `Pedido ${orderRefForGateway}`,
        externalReference: String(orderRefForGateway),
      });
    }
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // Persistir pagamento com status FAILED
    await prisma.payment.create({
      data: {
        amount: finalGrandTotal,
        method: billingType as any,
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

  // --- 7) normalizar/persistir payment no banco ---
  const raw = paymentResult.raw ?? paymentResult;

  const normalizedPixQr =
    paymentResult.pix_payload ??
    paymentResult.pix_payload_string ??
    paymentResult.pix_qr ??
    raw?.pixPayload ??
    raw?.pix_payload ??
    raw?.pixQr ??
    null;

  const normalizedPixExpiration =
    paymentResult.pix_expiration ??
    paymentResult.pixExpiration ??
    raw?.pixExpirationDate ??
    raw?.pix_expiration ??
    raw?.dueDate ??
    null;

  const normalizedPixEncodedImage = paymentResult.pix_qr_image ?? paymentResult.pixEncodedImage ?? raw?.pixQrEncodedImage ?? null;

  const normalizedBoletoUrl =
    paymentResult.boleto_url ??
    paymentResult.bankSlipUrl ??
    paymentResult.invoiceUrl ??
    raw?.bankSlipUrl ??
    raw?.invoiceUrl ??
    raw?.bankSlip ??
    null;

  const normalizedBoletoBarcode =
    paymentResult.boleto_barcode ??
    paymentResult.barcode ??
    paymentResult.line ??
    raw?.barCode ??
    raw?.line ??
    raw?.boleto_barCode ??
    null;

  const persistedPayment = await prisma.payment.create({
    data: {
      amount: finalGrandTotal,
      method: billingType as any,
      status: (paymentResult.status ?? 'PENDING') as any,
      transaction_id: paymentResult.id ?? null,
      asaas_customer_id: customer.asaas_customer_id ?? null,
      asaas_payment_id: paymentResult.id ?? null,
      description: paymentResult.description ?? null,
      installment_plan: paymentResult.installments ? { installments: paymentResult.installments } : undefined,
      pix_qr_code: normalizedPixQr ?? null,
      pix_expiration: normalizedPixExpiration ? new Date(normalizedPixExpiration) : null,
      boleto_url: normalizedBoletoUrl ?? null,
      boleto_barcode: normalizedBoletoBarcode ?? null,
      gateway_response: {
        raw,
        pix_qr_image: normalizedPixEncodedImage ?? null,
      } as any,
      order: { connect: { id: createdOrder.id } },
      customer: { connect: { id: customer.id } },
    },
  });

  // --- 8) buscar o pedido completo (items + payments + customer) e retornar para frontend ---
  const full = await prisma.order.findUnique({
    where: { id: createdOrder.id },
    include: {
      items: true,
      payment: true,
      customer: true,
    } as any,
  });

  const paymentsFromDb = await prisma.payment.findMany({
    where: { order_id: createdOrder.id },
    orderBy: { created_at: 'asc' } as any,
  });

  const itemsFromDb = await prisma.orderItem.findMany({ where: { order_id: createdOrder.id } });

  const normalized = {
    id: createdOrder.id,
    id_order_store: (createdOrder as any).id_order_store ?? null,
    total: Number(createdOrder.total ?? subtotal),
    shippingCost: Number(createdOrder.shippingCost ?? shippingCost ?? 0),
    grandTotal: Number(createdOrder.grandTotal ?? finalGrandTotal),
    shippingAddress: createdOrder.shippingAddress ?? (address ? `${address.street}, ${address.number ?? ''}` : null),
    shippingMethod: createdOrder.shippingMethod ?? String(shippingId),
    customer: customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, cpf: customer.cpf, asaas_customer_id: customer.asaas_customer_id ?? null } : null,
    items: itemsFromDb.map((it: any) => ({
      id: it.id,
      product_id: it.product_id,
      price: Number(it.price ?? 0),
      quantity: Number(it.quantity ?? 0),
    })),
    payments: paymentsFromDb.map((p: any) => ({
      id: p.id,
      amount: Number(p.amount ?? 0),
      method: p.method,
      status: p.status,
      transaction_id: p.transaction_id ?? null,
      asaas_payment_id: p.asaas_payment_id ?? null,
      boleto_url: p.boleto_url ?? null,
      boleto_barcode: p.boleto_barcode ?? null,
      pix_qr_code: p.pix_qr_code ?? null,
      pix_expiration: p.pix_expiration ?? null,
      gateway_response: p.gateway_response ?? null,
      created_at: p.created_at ?? null,
    })),
    created_at: full?.created_at ?? new Date().toISOString(),
    raw: full ?? null,
  };

  const paymentData = {
    boleto_url: normalizedBoletoUrl ?? null,
    boleto_barcode: normalizedBoletoBarcode ?? null,
    pix_qr: normalizedPixQr ?? null,
    pix_payload: raw?.pixPayload ?? raw?.pix_payload ?? null,/* @ts-ignore */
    pix_qr_image: (persistedPayment?.gateway_response?.pix_qr_image) ?? null,
    pix_qr_url: paymentResult.pix_qr_url ?? raw?.pixQrCodeUrl ?? raw?.pix_qr_url ?? null,
    pix_expiration: normalizedPixExpiration ?? null,
    checkoutUrl: paymentResult.checkoutUrl ?? raw?.checkoutUrl ?? null,
    raw,
    status: paymentResult.status ?? 'PENDING',
    id: paymentResult.id ?? null,
    amount: finalGrandTotal,
  };

  // --- 9) remover AbandonedCart (se cartId foi enviado) ---
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
  };
}