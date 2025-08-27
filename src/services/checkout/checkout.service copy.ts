// src/services/checkout/checkout.service.ts
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

type PlaceOrderInput = {
  customer_id?: string | undefined;
  addressId?: string | null;
  address?: AddressPayload | null;
  shippingId: string;
  paymentId: string;
  items: Array<{ product_id: string; price?: number; quantity?: number; weight?: number; length?: number; height?: number; width?: number; variant_id?: string | null }>;
  guestCustomer?: { name?: string; email?: string; phone?: string; cpf?: string };
  customerNote?: string;
  shippingCost?: number | null; // **novo**: se enviado, evita recálculo
  shippingRaw?: any | null; // opcional: raw option from frontend
  couponCode?: string | null;
};

export async function placeOrder(input: PlaceOrderInput) {
  const { customer_id, addressId, address, shippingId, paymentId, items, guestCustomer, shippingCost: shippingCostFromFrontend, shippingRaw } = input;

  // --- 1) customer load/create (igual ao anterior) ---
  let customer: any = null;
  if (customer_id) {
    customer = await prisma.customer.findUnique({ where: { id: customer_id } });
    if (!customer) throw new Error('Cliente não encontrado');
  } else {
    if (!guestCustomer || !guestCustomer.name) throw new Error('Dados do cliente visitante obrigatórios');
    try {
      // @ts-ignore - ajuste conforme seu schema se tiver campos obrigatórios extras
      customer = await prisma.customer.create({// @ts-ignore
        data: {
          name: guestCustomer.name,
          email: guestCustomer.email ?? `guest+${Date.now()}@example.com`,
          password: Math.random().toString(36).slice(2, 10),
          phone: guestCustomer.phone ?? '',
          cpf: guestCustomer.cpf ?? undefined,
        },
      });
    } catch (err: any) {
      throw new Error(`Falha ao criar cliente visitante: ${err?.message ?? String(err)}`);
    }
  }

  // tentar criar customer no Asaas (não falhar o checkout caso dê erro)
  if (!customer.asaas_customer_id) {
    try {
      const asaasCustomer = await AsaasClient.createCustomer({
        name: customer.name,
        email: customer.email ?? undefined,
        phone: customer.phone ?? undefined,
        cpfCnpj: customer.cpf ?? undefined,
      });
      await prisma.customer.update({ where: { id: customer.id }, data: { asaas_customer_id: asaasCustomer.id } });
      customer.asaas_customer_id = asaasCustomer.id;
    } catch (err) {
      console.warn('Não foi possível criar cliente na Asaas (continuando):', err instanceof Error ? err.message : err);
    }
  }

  // --- 2) subtotal (usar price enviado ou consultar produto) ---
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

  // --- 3) shippingCost: prioridade para frontend ---
  let shippingCost: number | undefined = undefined;
  if (typeof shippingCostFromFrontend === 'number' && !isNaN(shippingCostFromFrontend)) {
    shippingCost = shippingCostFromFrontend;
  }

  // se não tiver, vamos recalcular com MelhorEnvio (caminho fallback)
  if (shippingCost == null) {
    try {
      // se shippingRaw tem preço, tenta usar
      if (shippingRaw && typeof shippingRaw.price === 'number') {
        shippingCost = shippingRaw.price;
      } else {
        // obter dest zip
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
        // quoteArr agora é normalizado pela lib => [{ id, name, total (number|null), raw }]
        const first = Array.isArray(quoteArr) && quoteArr.length > 0 ? quoteArr[0] : null;
        if (!first || first.total == null) {
          throw new Error('MelhorEnvio: preço inválido na cotaçao');
        }
        shippingCost = Number(first.total);
      }
    } catch (err: any) {
      throw new Error(`Não foi possível calcular/validar o frete no servidor: ${err?.message ?? String(err)}. Se o frete já foi calculado no frontend, envie shippingCost no payload para evitar cálculo servidor.`);
    }
  }

  // --- 4) totals e criação do pedido ---
  const grandTotal = subtotal + (shippingCost ?? 0);

  const createdOrder = await prisma.$transaction(async (tx) => {
    const addressText = addressId
      ? ((await tx.address.findUnique({ where: { id: addressId } }))?.street ?? '')
      : `${address?.street ?? ''}, ${address?.number ?? ''} - ${address?.city ?? ''}/${address?.state ?? ''} - ${address?.zipCode ?? ''}`;

    const created = await tx.order.create({
      data: {
        total: subtotal,
        shippingCost: shippingCost ?? 0,
        grandTotal,
        shippingAddress: addressText,
        shippingMethod: shippingRaw ? (shippingRaw.provider ?? shippingRaw.carrier ?? String(shippingId)) : String(shippingId),
        customer: { connect: { id: customer.id } },
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

  // --- 5) criar cobrança na Asaas ---
  const billingType = paymentId.includes('pix') ? 'PIX' : paymentId.includes('boleto') ? 'BOLETO' : (paymentId.includes('card') ? 'CREDIT_CARD' : 'BOLETO');

  let paymentResult: any;
  try {
    paymentResult = await AsaasClient.createPayment({
      customer_asaaS_id: customer.asaas_customer_id ?? undefined,
      amount: grandTotal,
      billingType: billingType as any,
      description: `Pedido ${createdOrder.id}`,
      externalReference: String(createdOrder.id),
      dueDate: null,
    });
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await prisma.payment.create({
      data: {
        amount: grandTotal,
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

  // persist payment
  const payment = await prisma.payment.create({
    data: {
      amount: grandTotal,
      method: billingType as any,
      status: 'PENDING',
      transaction_id: paymentResult.id ?? null,
      asaas_customer_id: customer.asaas_customer_id ?? null,
      asaas_payment_id: paymentResult.id ?? null,
      description: paymentResult.description ?? null,
      installment_plan: paymentResult.installments ? { installments: paymentResult.installments } : undefined,
      pix_qr_code: paymentResult.pix_qr ?? null,
      pix_expiration: paymentResult.pix_expiration ? new Date(paymentResult.pix_expiration) : null,
      boleto_url: paymentResult.boleto_url ?? null,
      boleto_barcode: paymentResult.boleto_barcode ?? null,
      gateway_response: paymentResult.raw ?? paymentResult,
      order: { connect: { id: createdOrder.id } },
      customer: { connect: { id: customer.id } },
    },
  });

  return {
    success: true,
    orderId: createdOrder.id,
    paymentRedirectUrl: paymentResult.checkoutUrl ?? null,
    paymentData: {
      boleto_url: paymentResult.boleto_url ?? null,
      boleto_barcode: paymentResult.boleto_barcode ?? null,
      pix_qr: paymentResult.pix_qr ?? null,
      pix_qr_url: paymentResult.pix_qr_url ?? null,
      pix_expiration: paymentResult.pix_expiration ?? null,
    },
  };
}