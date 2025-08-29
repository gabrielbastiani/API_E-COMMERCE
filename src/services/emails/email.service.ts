import prisma from '../../prisma';

export async function createEmailReminderForCart(opts: { cartId: string; template_id?: string | undefined; customerId?: string | undefined }) {
  const { cartId, template_id, customerId } = opts;
  if (!cartId) throw new Error('cartId é obrigatório');

  // encontrar abandoned cart pelo cart_id
  const abandoned = await prisma.abandonedCart.findUnique({ where: { cart_id: cartId } });
  if (!abandoned) {
    const e: any = new Error('AbandonedCart não encontrado');
    e.status = 404;
    throw e;
  }

  // se customerId foi fornecido, validar que condiz
  if (customerId && abandoned.customer_id !== customerId) {
    const e: any = new Error('Não autorizado: cart não pertence ao customer informado');
    e.status = 403;
    throw e;
  }

  // criar email reminder registrando cart_id e eventuais template_id
  // Usar cart_id diretamente para evitar problemas de tipagem com relation connect + template_id optional
  const created = await prisma.emailReminder.create({
    data: {
      cart_id: abandoned.id, // NOTA: modelo EmailReminder tem cart (relation fields: [cart_id]); aqui o campo é cart_id que referencia AbandonedCart.id
      // Antes você estava tentando criar com "cart: { connect: { id: abandoned.id } }", OK também, mas usar cart_id evita erro TS com template optional
      template_id: template_id ?? null,
    } as any,
  });

  return created;
}