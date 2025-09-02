import path from 'path';
import prismaClient from '../../prisma';
import prisma from '../../prisma';
import ejs from 'ejs';
import nodemailer from "nodemailer";
require('dotenv/config');

export async function createEmailReminderForCart(opts: { cartId: string; template_id?: string | undefined; customerId?: string | undefined; email?: string | undefined;  }) {
  const { cartId, template_id, customerId, email } = opts;
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

  const infos_ecommerce = await prismaClient.ecommerceData.findFirst();

  const transporter = nodemailer.createTransport({
    host: process.env.HOST_SMTP,
    port: 465,
    secure: true,
    auth: {
      user: process.env.USER_SMTP,
      pass: process.env.PASS_SMTP
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const requiredPath = path.join(__dirname, `../../../emails_templates/email_carrinho_abandonado_1.ejs`);

  const data_templates = await prismaClient.emailTemplate.findFirst({
    where: {
      templateName: "email_carrinho_abandonado_1.ejs"
    }
  });

  const domain_site = process.env.URL_ECOMMERCE;
  const domain_api = process.env.URL_API;

  const data = await ejs.renderFile(requiredPath, {
    logo: infos_ecommerce?.logo,
    name_ecommerce: infos_ecommerce?.name,
    domain_site: domain_site,
    domain_api: domain_api
  });

  await transporter.sendMail({
    from: `"${infos_ecommerce?.name} " <${infos_ecommerce?.email}>`,
    to: email,
    subject: `${data_templates?.subject}`,
    html: data
  });

  // criar email reminder registrando cart_id e eventuais template_id
  // Usar cart_id diretamente para evitar problemas de tipagem com relation connect + template_id optional
  const created = await prisma.emailReminder.create({
    data: {
      cart_id: abandoned.id, // NOTA: modelo EmailReminder tem cart (relation fields: [cart_id]); aqui o campo é cart_id que referencia AbandonedCart.id
      // Antes você estava tentando criar com "cart: { connect: { id: abandoned.id } }", OK também, mas usar cart_id evita erro TS com template optional
      template_id: data_templates?.id ?? null,
    } as any,
  });

  return created;
}