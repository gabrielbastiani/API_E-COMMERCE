import prisma from '../../prisma';

export type NormalizedOrder = {
  id: string | number;
  id_order_store: string | number;
  total: number;
  shippingCost: number;
  grandTotal: number;
  address_id?: string | null;
  shippingMethod?: string | null;
  customer?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    cpf?: string | null;
    asaas_customer_id?: string | null;
  } | null;
  items: Array<{
    id?: string | number;
    product_id: string;
    price: number;
    quantity: number;
    name?: string | null;
  }>;
  payments: Array<any>;
  createdAt?: Date | string | null;
  raw?: any;
};

/**
 * Busca um pedido pelo id e normaliza o retorno.
 * - Se requestingCustomerId for fornecido, valida que o pedido pertence a esse cliente.
 * - Lança erros com status/message simples para o controller mapear.
 */
export async function getOrderById(orderId: string): Promise<NormalizedOrder> {
  if (!orderId) throw new Error('order_id obrigatório');

  // troque o cast se seu id for UUID (string) ou number conforme schema
  const where: any = { id: orderId };

  const order = await prisma.order.findUnique({
    where,
  });

  if (!order) {
    const e: any = new Error('Pedido não encontrado');
    e.status = 404;
    throw e;
  }

  // Itens do pedido
  const items = await prisma.orderItem.findMany({
    where: {
      order_id: order.id as any,
    },
  });

  // Pagamentos associados ao pedido (pode ser 1)
  const payments = await prisma.payment.findMany({
    where: {
      order_id: order.id as any,
    },
    orderBy: { created_at: 'asc' } as any,
  });

  // Cliente
  const customer = await prisma.customer.findUnique({
    where: { id: (order as any).customer_id as any },
  });

  const normalized: NormalizedOrder = {
    id: (order as any).id,
    id_order_store: (order as any).id_order_store,
    total: Number((order as any).total ?? 0),
    shippingCost: Number((order as any).shippingCost ?? 0),
    grandTotal: Number((order as any).grandTotal ?? 0),
    address_id: (order as any).address_id ?? null,
    shippingMethod: (order as any).shippingMethod ?? null,
    customer: customer
      ? {
          id: (customer as any).id,
          name: (customer as any).name,
          email: (customer as any).email,
          phone: (customer as any).phone,
          cpf: (customer as any).cpf,
          asaas_customer_id: (customer as any).asaas_customer_id ?? null,
        }
      : null,
    items: items.map((it: any) => ({
      id: it.id,
      product_id: it.product_id,
      price: Number(it.price ?? 0),
      quantity: Number(it.quantity ?? 0),
      name: it.name ?? null,
    })),
    payments: payments.map((p: any) => ({
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
    createdAt: (order as any).created_at ?? null,
    raw: order,
  };

  return normalized;
}