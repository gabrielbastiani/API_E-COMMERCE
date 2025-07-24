import { NotificationType, Role, TypeUser } from '@prisma/client';
import prismaClient from '../../../prisma';
import { hash } from 'bcryptjs';
import nodemailer from "nodemailer";
require('dotenv/config');
import ejs from 'ejs';
import path from "path";

interface UserRequest {
    name: string;
    email: string;
    password: string;
    newsletter?: string;
    phone: string;
    type_user: string;
    cpf?: string;
    cnpj?: string;
    date_of_birth: string;
    sexo: string;
    state_registration: string;
}

class CustomerCreateService {
    async execute({
        name,
        email,
        password,
        newsletter,
        phone,
        type_user,
        cpf,
        cnpj,
        date_of_birth,
        sexo,
        state_registration,
    }: UserRequest) {

        const newsletterBool =
            newsletter === "true" ? true : newsletter === "false" ? false : undefined;

        if (newsletterBool === undefined) {
            throw new Error("Invalid value for 'newsletter'. Use 'true' or 'false'.");
        }

        if (!email) {
            throw new Error("Email incorrect");
        }

        const userAlreadyExists = await prismaClient.customer.findFirst({
            where: {
                email: email,
            }
        });

        if (userAlreadyExists) {
            throw new Error("User already exists");
        }

        const passwordHash = await hash(password, 8);

        const user_create = await prismaClient.customer.create({
            data: {
                name: name,
                email: email,
                password: passwordHash,
                newsletter: newsletterBool,
                phone: phone,
                type_user: type_user as TypeUser,
                cpf: cpf,
                cnpj: cnpj,
                date_of_birth: date_of_birth,
                sexo: sexo,
                state_registration: state_registration
            }
        });

        if (newsletterBool === true) {
            await prismaClient.newsletter.create({
                data: {
                    email_user: email
                }
            });
        }

        const users_superAdmins = await prismaClient.userEcommerce.findMany({
            where: {
                role: Role.SUPER_ADMIN
            }
        });

        const all_user_ids = [
            ...users_superAdmins.map(userEcommerce => userEcommerce.id)
        ];

        const notificationsData = all_user_ids.map(userEcommerce_id => ({
            userEcommerce_id,
            message: "Cliente cadastrado com sucesso",
            type: NotificationType.USER
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
                templateName: "cliente_cadastrado.ejs"
            }
        });

        if (!data_templates) {
            await prismaClient.emailTemplate.create({
                data: {
                    title: "Novo cliente cadastrado",
                    subject: "Novo cliente cadastrado",
                    templateName: "cliente_cadastrado.ejs",
                    isActive: true,
                    hoursAfter: 0
                }
            });
        }

        const requiredPath = path.join(__dirname, `../../../emails_templates/cliente_cadastrado.ejs`);

        const domain_site = process.env.URL_ECOMMERCE;
        const domain_api = process.env.URL_API;

        const data = await ejs.renderFile(requiredPath, {
            name: name,
            logo: infos_ecommerce?.logo,
            name_ecommerce: infos_ecommerce?.name,
            domain_site: domain_site,
            domain_api: domain_api
        });

        transporter.sendMail({
            from: `"${infos_ecommerce?.name} " <${infos_ecommerce?.email}>`,
            to: `${infos_ecommerce?.email}`,
            subject: `${data_templates?.subject}`,
            html: data
        });

        return user_create;

    }

}

export { CustomerCreateService }