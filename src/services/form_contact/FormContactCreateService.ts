import prismaClient from "../../prisma";
import nodemailer from "nodemailer";
require('dotenv/config');
import ejs from 'ejs';
import path from "path";
import { NotificationType, Role } from "@prisma/client";

interface FormRequest {
    email_user: string;
    name_user: string;
    subject: string;
    message: string;
}

class FormContactCreateService {
    async execute({ email_user, name_user, subject, message }: FormRequest) {

        function removerAcentos(s: any) {
            return s.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/[/]/g, "-");
        }

        const comment_create = await prismaClient.formContact.create({
            data: {
                email_user: email_user,
                name_user: name_user,
                slug_name_user: removerAcentos(name_user),
                subject: subject,
                message: message
            }
        });

        const users_superAdmins = await prismaClient.userEcommerce.findMany({
            where: {
                role: Role.SUPER_ADMIN
            }
        });

        const users_admins = await prismaClient.userEcommerce.findMany({
            where: {
                role: Role.ADMIN
            }
        });

        const all_user_ids = [
            ...users_superAdmins.map(userEcommerce => userEcommerce.id),
            ...users_admins.map(userEcommerce => userEcommerce.id)
        ];

        const notificationsData = all_user_ids.map(userEcommerce_id => ({
            userEcommerce_id,
            message: "Formulario de contato enviado",
            type: NotificationType.CONTACT_FORM
        }));

        await prismaClient.notificationUserEcommerce.createMany({
            data: notificationsData
        });

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

        const infos_ecommerce = await prismaClient.ecommerceData.findFirst();

        const data_templates = await prismaClient.emailTemplate.findFirst({
            where: {
                templateName: "criacao_de_mensagem_formulario.ejs"
            }
        });

        if (!data_templates) {
            await prismaClient.emailTemplate.create({
                data: {
                    title: "Formulario de contato na loja",
                    subject: "Alguém enviou uma mensagem para loja",
                    templateName: "criacao_de_mensagem_formulario.ejs",
                    isActive: true,
                    hoursAfter: 0
                }
            });
        }

        const requiredPath = path.join(__dirname, `../../emails_templates/criacao_de_mensagem_formulario.ejs`);

        const domain_site = process.env.URL_ECOMMERCE;
        const domain_api = process.env.URL_API;

        const data = await ejs.renderFile(requiredPath, {
            name: name_user,
            message: message,
            subject: subject,
            logo: infos_ecommerce?.logo,
            name_ecommerce: infos_ecommerce?.name,
            domain_site: domain_site,
            domain_api: domain_api
        });

        await transporter.sendMail({
            from: `"${infos_ecommerce?.name} " <${email_user}>`,
            to: `${infos_ecommerce?.email}`,
            subject: `${data_templates?.subject}`,
            html: data
        });

        return comment_create;

    }
}

export { FormContactCreateService }