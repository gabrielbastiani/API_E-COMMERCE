import nodemailer from "nodemailer";
import prismaClient from "../../prisma";
import path from "path";
import ejs from "ejs";
import moment from "moment";

class EndPromotionScheduler {
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
                    status: "Disponivel_programado",
                    endDate: { lte: now },
                    is_processing: false,
                    email_sent: false,
                },
            });

            for (const pub of promotions) {
                // Atualiza status para evitar concorrência
                await prismaClient.promotion.update({
                    where: { id: pub.id },
                    data: {
                        is_processing: true,
                        email_sent: true
                    },
                });

                try {
                    await prismaClient.promotion.update({
                        where: { id: pub.id },
                        data: {
                            status: "Indisponivel",
                            is_completed: true,
                            is_processing: false,
                        },
                    });

                    const start = moment(pub.startDate).format('DD/MM/YYYY HH:mm');
                    const end = moment(pub.endDate).format('DD/MM/YYYY HH:mm');
                    /* @ts-ignore */
                    await this.sendEmail(pub.name, start, end);
                } catch (emailError) {
                    console.error(`Erro ao processar encerramento de ${pub.name}:`, emailError);
                }
            }
        } catch (error) {/* @ts-ignore */
            console.error("Erro ao encerrar promoção:", error.message);
            /* @ts-ignore */
            if (error.code === "P1001") {
                console.error("Erro de conexão com o banco de dados. Verifique o servidor.");
            }
        }
    }

    private async sendEmail(title: string, start: string, end: string) {

        const domain_sites = process.env.URL_ECOMMERCE;
        const domain_apii = process.env.URL_API;

        const infos_store = await prismaClient.ecommerceData.findFirst();
        const name = infos_store?.name;
        const logo = infos_store?.logo;
        const domain_site = domain_sites;
        const domain_api = domain_apii;

        const data_templates = await prismaClient.emailTemplate.findFirst({
            where: {
                templateName: "encerrar_promocao_programada.ejs"
            }
        });

        if (!data_templates) {
            await prismaClient.emailTemplate.create({
                data: {
                    title: "Promoção Programada Encerrada",
                    subject: "Promoção Programada Encerrada",
                    templateName: "encerrar_promocao_programada.ejs",
                    isActive: true,
                    hoursAfter: 0
                }
            });
        }

        const emailTemplatePath = path.join(__dirname, "../../emails_templates/encerrar_promocao_programada.ejs");

        const htmlContent = await ejs.renderFile(emailTemplatePath, { title, start, end, name, logo, domain_site, domain_api });

        await this.transporter.sendMail({
            from: `"${infos_store?.name} " <${infos_store?.email}>`,
            to: `${infos_store?.email}`,
            subject: `${data_templates?.subject}`,
            html: htmlContent,
        });
    }
}

export { EndPromotionScheduler };