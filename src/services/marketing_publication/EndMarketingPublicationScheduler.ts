import nodemailer from "nodemailer";
import prismaClient from "../../prisma";
import path from "path";
import ejs from "ejs";
import moment from "moment";

class EndMarketingPublicationScheduler {
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

            // Busca publicações que precisam ser encerradas e não estão em processamento
            const publications = await prismaClient.marketingPublication.findMany({
                where: {
                    status: "Disponivel_programado",
                    publish_at_end: { lte: now },
                    is_processing: false,
                    email_sent: false, // Apenas publicações sem email enviado
                },
            });

            for (const pub of publications) {
                // Atualiza status para evitar concorrência
                await prismaClient.marketingPublication.update({
                    where: { id: pub.id },
                    data: {
                        is_processing: true,
                        email_sent: true
                    },
                });

                try {
                    await prismaClient.marketingPublication.update({
                        where: { id: pub.id },
                        data: {
                            status: "Indisponivel",
                            is_completed: true,
                            is_processing: false,
                        },
                    });

                    const start = moment(pub.publish_at_start).format('DD/MM/YYYY HH:mm');
                    const end = moment(pub.publish_at_end).format('DD/MM/YYYY HH:mm');
                    /* @ts-ignore */
                    await this.sendEmail(pub.title, start, end);
                } catch (emailError) {
                    console.error(`Erro ao processar encerramento de ${pub.title}:`, emailError);
                }
            }
        } catch (error) {/* @ts-ignore */
            console.error("Erro ao encerrar publicações:", error.message);
            /* @ts-ignore */
            if (error.code === "P1001") {
                console.error("Erro de conexão com o banco de dados. Verifique o servidor.");
            }
        }
    }

    private async sendEmail(title: string, start: string, end: string) {

        const domain_sites = process.env.URL_ECOMMERCE;
        const domain_apii = process.env.URL_API;

        const infos_blog = await prismaClient.ecommerceData.findFirst();
        const name = infos_blog?.name;
        const logo = infos_blog?.logo;
        const domain_site = domain_sites;
        const domain_api = domain_apii;

        await prismaClient.emailTemplate.create({
            data: {
                title: "Publicidade Programada Encerrada",
                subject: "Publicidade Programada Encerrada",
                templateName: "encerrar_publicidade_programada.ejs",
                isActive: true,
                hoursAfter: 0
            }
        });

        const emailTemplatePath = path.join(__dirname, "../../emails_templates/encerrar_publicidade_programada.ejs");

        const data_templates = await prismaClient.emailTemplate.findFirst({
            where: {
                templateName: "encerrar_publicidade_programada.ejs"
            }
        });

        const htmlContent = await ejs.renderFile(emailTemplatePath, { title, start, end, name, logo, domain_site, domain_api });

        await this.transporter.sendMail({
            from: `"${infos_blog?.name} " <${infos_blog?.email}>`,
            to: `${infos_blog?.email}`,
            subject: `${data_templates?.subject}`,
            html: htmlContent,
        });
    }
}

export { EndMarketingPublicationScheduler };