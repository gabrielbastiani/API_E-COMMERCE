import nodemailer from "nodemailer";
import prismaClient from "../../prisma";
import path from "path";
import ejs from "ejs";
import moment from "moment";
import { NotificationType, Role } from "@prisma/client";

class StartPromotionScheduler {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
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
    }

    async execute() {
        try {
            const now = new Date();

            const promotions = await prismaClient.promotion.findMany({
                where: {
                    status: "Programado",
                    startDate: { lte: now },
                    is_processing: false,
                    is_completed: false,
                    email_sent: false,
                },
            });

            for (const pub of promotions) {
                // Atualiza status para evitar concorrência
                await prismaClient.promotion.update({
                    where: { id: pub.id },
                    data: {
                        is_processing: true,
                        status: "Disponivel_programado",
                    },
                });

                try {
                    const start = moment(pub.startDate).format('DD/MM/YYYY HH:mm');
                    const end = moment(pub.endDate).format('DD/MM/YYYY HH:mm');
                    /* @ts-ignore */
                    await this.sendEmail(pub?.name, start, end);
                    console.log(`Iniciada publicidade: ${pub.name}`);
                } catch (emailError) {
                    console.error(`Erro ao enviar email para ${pub.name}:`, emailError);
                }

                // Finaliza processamento
                await prismaClient.promotion.update({
                    where: { id: pub.id },
                    data: {
                        is_processing: false,
                    },
                });
            }
        } catch (error) {
            console.error("Erro ao iniciar a promoção:", error);
        }
    }

    private async sendEmail(title: string, start: string, end: string) {
        const domain_sitee = process.env.URL_ECOMMERCE;
        const domain_apii = process.env.URL_API;
        const infos_ecommerce = await prismaClient.ecommerceData.findFirst();
        const name = infos_ecommerce?.name;
        const logo = infos_ecommerce?.logo;
        const domain_site = domain_sitee;
        const domain_api = domain_apii;

        const data_templates = await prismaClient.emailTemplate.findFirst({
            where: {
                templateName: "promocao_programada.ejs"
            }
        });

        if (!data_templates) {
            await prismaClient.emailTemplate.create({
            data: {
                title: "Promoção Programada Iniciada",
                subject: "Promoção Programada Iniciada",
                templateName: "promocao_programada.ejs",
                isActive: true,
                hoursAfter: 0
            }
        });
        }

        const emailTemplatePath = path.join(__dirname, "../../emails_templates/promocao_programada.ejs");

        const htmlContent = await ejs.renderFile(emailTemplatePath, { title, start, end, name, logo, domain_site, domain_api });

        await this.transporter.sendMail({
            from: `"${infos_ecommerce?.name} " <${infos_ecommerce?.email}>`,
            to: `${infos_ecommerce?.email}`,
            subject: `${data_templates?.subject}`,
            html: htmlContent,
        });

        const users_superAdmins = await prismaClient.userEcommerce.findMany({ where: { role: Role.SUPER_ADMIN } });
        const users_admins = await prismaClient.userEcommerce.findMany({ where: { role: Role.ADMIN } });

        const all_user_ids = [
            ...users_superAdmins.map((user) => user.id),
            ...users_admins.map((user) => user.id),
        ];

        const notificationsData = all_user_ids.map((userEcommerce_id) => ({
            userEcommerce_id,
            message: `Programação programada "${title ? title : "Sem nome"}" foi publicado na loja.`,
            type: NotificationType.MARKETING
        }));

        await prismaClient.notificationUserEcommerce.createMany({ data: notificationsData });
    }

}

export { StartPromotionScheduler };