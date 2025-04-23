import nodemailer from "nodemailer";
import prismaClient from "../../prisma";
import path from "path";
import ejs from "ejs";
import moment from "moment";
import { NotificationType, Role } from "@prisma/client";

class StartMarketingPublicationScheduler {
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

            // Busca publicações que precisam ser iniciadas e não estão em processamento
            const publications = await prismaClient.marketingPublication.findMany({
                where: {
                    status: "Programado",
                    publish_at_start: { lte: now },
                    is_processing: false,
                    is_completed: false, // Não processar se já finalizado
                    email_sent: false, // Apenas publicações sem email enviado
                },
            });

            for (const pub of publications) {
                // Atualiza status para evitar concorrência
                await prismaClient.marketingPublication.update({
                    where: { id: pub.id },
                    data: {
                        is_processing: true,
                        status: "Disponivel_programado",
                    },
                });

                try {
                    const start = moment(pub.publish_at_start).format('DD/MM/YYYY HH:mm');
                    const end = moment(pub.publish_at_end).format('DD/MM/YYYY HH:mm');
                    /* @ts-ignore */
                    await this.sendEmail(pub?.title, start, end);
                    console.log(`Iniciada publicidade: ${pub.title}`);
                } catch (emailError) {
                    console.error(`Erro ao enviar email para ${pub.title}:`, emailError);
                }

                // Finaliza processamento
                await prismaClient.marketingPublication.update({
                    where: { id: pub.id },
                    data: {
                        is_processing: false,
                    },
                });
            }
        } catch (error) {
            console.error("Erro ao iniciar publicações:", error);
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

        await prismaClient.emailTemplate.create({
            data: {
                title: "Publicidade Programada Iniciada",
                subject: "Publicidade Programada Iniciada",
                templateName: "publicidade_programada.ejs",
                isActive: true,
                hoursAfter: 0
            }
        });

        const emailTemplatePath = path.join(__dirname, "../../emails_templates/publicidade_programada.ejs");

        const data_templates = await prismaClient.emailTemplate.findFirst({
            where: {
                templateName: "publicidade_programada.ejs"
            }
        });

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

        const notificationsData = all_user_ids.map((user_id) => ({
            user_id,
            message: `Publicidade programada "${title ? title : "Sem titulo"}" foi publicado no blog.`,
            type: NotificationType.MARKETING
        }));

        await prismaClient.notificationUserEcommerce.createMany({ data: notificationsData });
    }

}

export { StartMarketingPublicationScheduler };