import nodemailer from "nodemailer";
import prismaClient from "../../prisma";
import path from "path";
import ejs from "ejs";
import moment from "moment";

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
        const domain_sitee = process.env.URL_SITE;
        const domain_apii = process.env.URL_API;
        const infos_blog = await prismaClient.configurationBlog.findFirst();
        const name_blog = infos_blog?.name_blog;
        const logo = infos_blog?.logo;
        const domain_site = domain_sitee;
        const domain_api = domain_apii;
        const emailTemplatePath = path.join(__dirname, "../emails_transacionais/publicidade_programada.ejs");

        const htmlContent = await ejs.renderFile(emailTemplatePath, { title, start, end, name_blog, logo, domain_site, domain_api });

        await this.transporter.sendMail({
            from: `"${infos_blog?.name_blog} " <${infos_blog?.email_blog}>`,
            to: `${infos_blog?.email_blog}`,
            subject: "Publicidade Programada Iniciada",
            html: htmlContent,
        });

        const users_superAdmins = await prismaClient.user.findMany({ where: { role: Role.SUPER_ADMIN } });
        const users_admins = await prismaClient.user.findMany({ where: { role: Role.ADMIN } });

        const all_user_ids = [
            ...users_superAdmins.map((user) => user.id),
            ...users_admins.map((user) => user.id),
        ];

        const notificationsData = all_user_ids.map((user_id) => ({
            user_id,
            message: `Publicidade programada "${title ? title : "Sem titulo"}" foi publicado no blog.`,
            type: "marketing",
        }));

        await prismaClient.notificationUser.createMany({ data: notificationsData });
    }

}

export { StartMarketingPublicationScheduler };