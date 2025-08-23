import prisma from '../../prisma';
import * as AsaasClient from '../checkout/asaas.client';
import * as MelhorEnvioClient from '../checkout/melhorenvio.client';

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

type ShippingCalcInput = {
  customer_id?: string;
  addressId?: string | null;
  address?: AddressPayload | null;
  items: any[];
};

export async function listAddresses(customerId: string) {
  return prisma.address.findMany({ where: { customer_id: customerId }, orderBy: { created_at: 'desc' } });
}

export async function createAddress(customerId: string, payload: AddressPayload) {
  // ensure required default values (Prisma expects country non-null)
  const data: any = {
    customer_id: customerId,
    recipient_name: payload.recipient_name ?? undefined,
    street: payload.street,
    city: payload.city,
    state: payload.state,
    zipCode: payload.zipCode,
    country: payload.country ?? 'Brasil',
    number: payload.number ?? null,
    neighborhood: payload.neighborhood ?? null,
    complement: payload.complement ?? null,
    reference: payload.reference ?? null,
  };

  const created = await prisma.address.create({ data });
  return created;
}

export async function updateAddress(customerId: string, addressId: string, payload: Partial<AddressPayload>) {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.customer_id !== customerId) throw new Error('Endereço não encontrado');

  const data: any = { ...payload };
  if (Object.prototype.hasOwnProperty.call(data, 'country')) data.country = data.country ?? 'Brasil';

  const updated = await prisma.address.update({ where: { id: addressId }, data });
  return updated;
}

export async function deleteAddress(customerId: string, addressId: string) {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.customer_id !== customerId) throw new Error('Endereço não encontrado');
  await prisma.address.delete({ where: { id: addressId } });
}

// shipping: consult MelhorEnvio client (assume client.quote exists)
export async function calculateShipping(input: ShippingCalcInput) {
  let destZip: string | undefined;
  if (input.addressId) {
    const a = await prisma.address.findUnique({ where: { id: input.addressId } });
    if (!a) throw new Error('Endereço não encontrado');
    destZip = a.zipCode;
  } else if (input.address) {
    destZip = input.address.zipCode;
  }

  const originZip = process.env.ORIGIN_CEP;
  if (!originZip) throw new Error('Origin ZIP not configured on server');
  if (!destZip) throw new Error('Destino (addressId/address.zipCode) obrigatório para cotação');

  const products = (input.items || []).map((it: any) => ({
    name: it.name ?? 'Produto',
    quantity: it.quantity ?? 1,
    price: Math.round((it.price ?? 0) * 100) / 100,
    weight: (it.weight ?? 0.1),
    width: it.width ?? 10,
    height: it.height ?? 2,
    length: it.length ?? 10,
  }));

  const cotacao = await MelhorEnvioClient.quote({ from: originZip, to: destZip, products });
  const options = cotacao.map((c: any) => ({
    id: `${c.carrier ?? c.provider}-${c.service}`,
    provider: c.carrier ?? c.provider,
    service: c.service,
    price: Number(c.total ?? c.price ?? 0),
    estimated_days: c.deadline ?? null,
    raw: c,
  }));

  return options;
}

export async function getPaymentOptions() {
  return [
    { id: 'asaas-pix', provider: 'Asaas', method: 'PIX', label: 'PIX (pagamento instantâneo)', description: 'Pague via QR Code Pix' },
    { id: 'asaas-boleto', provider: 'Asaas', method: 'BOLETO', label: 'Boleto bancário', description: 'Pague com boleto' },
    { id: 'asaas-card', provider: 'Asaas', method: 'CARD', label: 'Cartão de crédito', description: 'Cartão de crédito (tokenização / checkout)' },
  ];
}

/**
 * placeOrder
 * - input.customer_id: optional (if authenticated)
 * - input.addressId or input.address (guest inline)
 * - input.items: [{ product_id, price, quantity, weight, length, height, width, variant_id? }]
 * - returns { success, orderId, paymentRedirectUrl?, paymentData? }
 */
export async function placeOrder(input: {
  customer_id?: string | undefined;
  addressId?: string | null;
  address?: AddressPayload | null;
  shippingId: string;
  paymentId: string;
  items: any[];
  guestCustomer?: { name?: string; email?: string; phone?: string; cpf?: string };
  customerNote?: string;
  couponCode?: string | null;
}) {
  const { customer_id, addressId, address, shippingId, paymentId, items, guestCustomer } = input;

  // resolve customer (existing or create guest)
  let customer: any = null;
  if (customer_id) {
    customer = await prisma.customer.findUnique({ where: { id: customer_id } });
    if (!customer) throw new Error('Cliente não encontrado');
  } else {
    if (!guestCustomer || !guestCustomer.name) throw new Error('Dados do cliente visitante obrigatórios');
    customer = await prisma.customer.create({/* @ts-ignore */
      data: {
        name: guestCustomer.name,
        email: guestCustomer.email ?? `guest+${Date.now()}@example.com`,
        password: Math.random().toString(36).slice(2, 12),
        phone: guestCustomer.phone ?? '',
        cpf: guestCustomer.cpf ?? null,
      },
    });
  }

  // ensure asaas customer exists (create if missing)
  if (!customer.asaas_customer_id) {
    try {
      const asaasCustomer = await AsaasClient.createCustomer({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        cpfCnpj: customer.cpf ?? undefined,
      });
      await prisma.customer.update({ where: { id: customer.id }, data: { asaas_customer_id: asaasCustomer.id } });
      customer.asaas_customer_id = asaasCustomer.id;
    } catch (err) {
      console.warn('Não foi possível criar cliente na Asaas:', err);
    }
  }

  // validate items and compute subtotal (use price from payload for speed, but validate existence)
  let subtotal = 0;
  for (const it of items) {
    const product = await prisma.product.findUnique({ where: { id: it.product_id } });
    if (!product) throw new Error(`Produto ${it.product_id} não encontrado`);
    const price = it.price ?? product.price_per ?? 0;
    subtotal += price * (it.quantity ?? 1);
  }

  // recalculate shipping
  const shippingOptions = await calculateShipping({ addressId, address, items });
  const chosenShipping = shippingOptions.find((s: any) => s.id === shippingId);
  if (!chosenShipping) throw new Error('Opção de frete inválida');
  const shippingCost = chosenShipping.price ?? 0;
  const grandTotal = subtotal + shippingCost;

  // create order + items inside transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    const shippingAddressText = addressId
      ? (() => {
        const a = tx.address.findUnique({ where: { id: addressId } });
        return a ? `${(a as any).street ?? ''}, ${(a as any).number ?? ''} - ${(a as any).city ?? ''}/${(a as any).state ?? ''} - ${(a as any).zipCode ?? ''}` : '';
      })()
      : `${address?.street ?? ''}, ${address?.number ?? ''} - ${address?.city ?? ''}/${address?.state ?? ''} - ${address?.zipCode ?? ''}`;

    const created = await tx.order.create({
      data: {
        total: subtotal,
        shippingCost,
        grandTotal,
        shippingAddress: (addressId ? '' : shippingAddressText) || shippingAddressText,
        shippingMethod: `${chosenShipping.provider ?? ''} - ${chosenShipping.service ?? ''}`,
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

      // decrement product stock if desired (catch errors separately)
      try {
        await tx.product.update({ where: { id: it.product_id }, data: { stock: { decrement: it.quantity ?? 0 } } });
      } catch (e) {
        // ignore stock errors for now (or log)
      }
    }

    return created;
  });

  // create payment on Asaas
  const billingType = paymentId.includes('pix') ? 'PIX' : paymentId.includes('boleto') ? 'BOLETO' : (paymentId.includes('card') ? 'CREDIT_CARD' : 'BOLETO');

  const paymentResult = await AsaasClient.createPayment({
    customerId: customer.asaas_customer_id ?? undefined,
    amount: grandTotal,
    billingType,
    description: `Pedido ${createdOrder.id}`,
    externalReference: createdOrder.id,
    dueDate: null,
  });

  // persist payment record - adapt to your Payment model
  const paymentRecord = await prisma.payment.create({
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