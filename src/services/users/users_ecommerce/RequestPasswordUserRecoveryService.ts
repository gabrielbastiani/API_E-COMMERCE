import prismaClient from "../../../prisma";
import nodemailer from "nodemailer";
require('dotenv/config');
import ejs from 'ejs';
import path from "path";

interface RecoveryRequest {
    email: string;
}

class RequestPasswordUserRecoveryService {
    async execute({ email }: RecoveryRequest) {

        const user = await prismaClient.userEcommerce.findFirst({
            where: {
                email,
            },
        });

        if (!user) {
            throw {
                error: { field: "email", message: "Conta não encontrada." },
                code: 400,
            };
        }

        const recovery = await prismaClient.passwordRecoveryUserEcommerce.create({
            data: {
                email,
            },
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
                templateName: "recuperar_senha.ejs"
            }
        });

        if (!data_templates) {
            await prismaClient.emailTemplate.create({
                data: {
                    title: "Recuperação de senha usuario do e-commerce",
                    subject: "Recuperação de senha",
                    templateName: "recuperar_senha.ejs",
                    isActive: true,
                    hoursAfter: 0
                }
            });
        }

        const requiredPath = path.join(__dirname, `../../../emails_templates/recuperar_senha.ejs`);

        const domain_site = process.env.URL_ECOMMERCE;
        const domain_api = process.env.URL_API;

        const data = await ejs.renderFile(requiredPath, {
            name: user.name,
            id: recovery.id,
            logo: infos_ecommerce?.logo,
            name_ecommerce: infos_ecommerce?.name,
            domain_site: domain_site,
            domain_api: domain_api
        });

        await transporter.sendMail({
            from: `"${infos_ecommerce?.name} " <${infos_ecommerce?.email}>`,
            to: user.email,
            subject: `${data_templates?.subject}`,
            html: data
        });

        return {
            message: "Verifique seu E-mail",
        };
    }
}

export { RequestPasswordUserRecoveryService };