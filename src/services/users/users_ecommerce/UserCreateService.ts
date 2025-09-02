import { NotificationType, Role, StatusUserEcommerce } from '@prisma/client';
import prismaClient from '../../../prisma';
import { hash } from 'bcryptjs';
import nodemailer from "nodemailer";
require('dotenv/config');
import ejs from 'ejs';
import path from "path";

interface UserRequest {
    name: string;
    email: string;
    photo?: string;
    password: string;
    role?: string;
    send_email?: boolean;
}

class UserCreateService {
    async execute({ name, email, password, photo, role, send_email }: UserRequest) {

        if (!email) {
            throw new Error("Email incorrect");
        }

        const userAlreadyExists = await prismaClient.userEcommerce.findFirst({
            where: {
                email: email,
            }
        });

        if (userAlreadyExists) {
            throw new Error("User already exists");
        }

        const passwordHash = await hash(password, 8);

        const first_super_user = await prismaClient.userEcommerce.findFirst({
            where: {
                role: Role.SUPER_ADMIN
            }
        });

        if (first_super_user) {
            const user_create = await prismaClient.userEcommerce.create({
                data: {
                    name: name,
                    email: email,
                    photo: photo,
                    password: passwordHash,
                    role: role as Role,
                    status: StatusUserEcommerce.DISPONIVEL
                }
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
                message: "Usuário criado com sucesso",
                type: NotificationType.USER
            }));

            await prismaClient.notificationUserEcommerce.createMany({
                data: notificationsData
            });

            const infos_ecommerce = await prismaClient.ecommerceData.findFirst();

            const data_templates = await prismaClient.emailTemplate.findFirst({
                where: {
                    templateName: "criacao_de_employee.ejs"
                }
            });

            if (!data_templates) {
                await prismaClient.emailTemplate.create({
                    data: {
                        title: "Novo usuario se cadastrando no CMS",
                        subject: "Novo usuario se cadastrando no CMS",
                        templateName: "criacao_de_employee.ejs",
                        isActive: true,
                        hoursAfter: 0
                    }
                });
            }

            const requiredPath = path.join(__dirname, `../../../emails_templates/criacao_de_employee.ejs`);

            const domain_site = process.env.URL_ECOMMERCE;
            const domain_api = process.env.URL_API;

            const data = await ejs.renderFile(requiredPath, {
                name_user: user_create.name,
                name_ecommerce: infos_ecommerce?.name,
                logo: infos_ecommerce?.logo,
                domain_site: domain_site,
                domain_api: domain_api
            });

            await transporter.sendMail({
                from: `"${infos_ecommerce?.name} " <${infos_ecommerce?.email}>`,
                to: `${infos_ecommerce?.email}`,
                subject: `${data_templates?.subject}`,
                html: data
            });

            if (send_email === true) {

                const infos_ecommerce = await prismaClient.ecommerceData.findFirst();

                const data_templates = await prismaClient.emailTemplate.findFirst({
                    where: {
                        templateName: "data_login_user.ejs"
                    }
                });

                if (!data_templates) {
                    await prismaClient.emailTemplate.create({
                        data: {
                            title: "Dados de acesso CMS",
                            subject: "Dados de acesso CMS",
                            templateName: "data_login_user.ejs",
                            isActive: true,
                            hoursAfter: 0
                        }
                    });
                }

                const requiredPath = path.join(__dirname, `../../../emails_templates/data_login_user.ejs`);

                const domain_site = process.env.URL_ECOMMERCE;
                const domain_api = process.env.URL_API;

                const data = await ejs.renderFile(requiredPath, {
                    name_user: user_create.name,
                    email: user_create.email,
                    password: password,
                    name_ecommerce: infos_ecommerce?.name,
                    logo: infos_ecommerce?.logo,
                    domain_site: domain_site,
                    domain_api: domain_api
                });

                await transporter.sendMail({
                    from: `"${infos_ecommerce?.name} " <${infos_ecommerce?.email}>`,
                    to: user_create.email,
                    subject: `${data_templates?.subject}`,
                    html: data
                });

            }

            return user_create;

        }

        const colors = {
            textos_menu: "#FFFFFF",
            fundo_rodape: "#1f2937",
            setas_slides: "#FFFFFF",
            texto_rodape: "#FFFFFF",
            fundo_do_menu: "#000000",
            textos_botoes: "#ffffff",
            fundo_newslatter: "#6b7280",
            icone_login_menu: "#FFFFFF",
            texto_newslatter: "#000000",
            fundo_popup_login: "#ffffff",
            titulo_newslatter: "#FFFFFF",
            botao_like_dislike: "#374151",
            fundo_blocos_sobre: "#FFFFFF",
            fundo_setas_slides: "#1f2937",
            fundo_sidebar_site: "#f3f4f6",
            icone_usuario_menu: "#FFFFFF",
            texto_like_dislike: "#374151",
            texto_sobre_pagina: "#6b7280",
            textos_popup_login: "#000000",
            fundo_botao_validar: "#f97316",
            fundo_ultimos_posts: "#e5e9ee",
            texto_ultimos_posts: "#000000",
            titulo_pagina_sobre: "#000000",
            titulo_ultimos_posts: "#000000",
            fundo_popup_marketing: "#ffffff",
            texto_popup_marketing: "#000000",
            titulo_pagina_contato: "#000000",
            fundo_botao_newslatter: "#f97316",
            texto_botao_newslatter: "#FFFFFF",
            nome_usuario_comentario: "#000000",
            dados_usuario_comentario: "#4b5563",
            fundo_blocos_todos_posts: "#FFFFFF",
            botao_texto_slides_banner: "#FFFFFF",
            fundo_botao_login_usuario: "#f97316",
            fundo_botao_slides_banner: "#dd1818",
            segundo_fundo_layout_site: "#e1e4e9",
            texto_botao_login_usuario: "#FFFFFF",
            titulo_sobre_pagina_sobre: "#1f2937",
            terceiro_fundo_layout_site: "#e1e4e9",
            texto_publicidades_sidebar: "#000000",
            titulo_compartilhar_artigo: "#374151",
            fundo_botao_popup_marketing: "#dd1818",
            fundo_secoes_titulo_paginas: "#1f2937",
            texto_botao_popup_marketing: "#ffffff",
            titulo_secoes_titulo_paginas: "#FFFFFF",
            dados_post_blocos_todos_posts: "#6b7280",
            fundo_blocos_todas_categorias: "#1f2937",
            fundo_posts_mais_vizualizados: "#e5e9ee",
            texto_posts_mais_vizualizados: "#000000",
            fundo_botao_formulario_contato: "#dd1818",
            texto_chamada_para_acao_slides: "#FFFFFF",
            titulo_post_blocos_todos_posts: "#000000",
            titulo_posts_mais_vizualizados: "#000000",
            texto_categorias_pagina_inicial: "#ffffff",
            campos_inputs_formulario_contato: "#374151",
            descricoes_secoes_titulo_paginas: "#bdc1c6",
            fundo_botao_publicidades_sidebar: "#dd1818",
            fundo_categoria_no_bloco_do_post: "#dcfce7",
            texto_botao_publicidades_sidebar: "#ffffff",
            titulo_categorias_pagina_inicial: "#000000",
            leia_mais_post_blocos_todos_posts: "#dd1818",
            likes_e_dislike_usuario_comentario: "#6b7280",
            texto_nome_categoria_no_bloco_do_post: "#16a34a",
            vizualizacoes_posts_mais_vizualizados: "#000000",
            fundo_blocos_categorias_pagina_inicial: "#797a7b",
            mini_descricao_post_blocos_todos_posts: "#4b5563",
            nome_categoria_blocos_todas_categorias: "#FFFFFF",
            fundo_botao_enviar_comentario_e_cadastrar: "#16a34a",
            nome_subcategoria_blocos_todas_categorias: "#f97316",
            texto_botao_enviar_comentario_e_cadastrar: "#FFFFFF",
            descricao_categoria_blocos_todas_categorias: "#d1d5db",
            subcategoria_categoria_blocos_todas_categorias: "#f87171"
        }

        await prismaClient.themeSettings.create({
            data: { colors }
        });

        const user_create_super_admin = await prismaClient.userEcommerce.create({
            data: {
                name: name,
                email: email,
                photo: photo,
                password: passwordHash,
                role: Role.SUPER_ADMIN
            }
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

        await prismaClient.emailTemplate.create({
            data: {
                title: "Novo super administrador se cadastrando no CMS",
                subject: "Novo super administrador se cadastrando no CMS",
                templateName: "criacao_de_super_administrador.ejs",
                isActive: true,
                hoursAfter: 0
            }
        });

        await prismaClient.emailTemplate.create({
            data: {
                title: "Email carrinho abandonado 1",
                subject: "Deixou algo para tras",
                templateName: "email_carrinho_abandonado_1.ejs",
                isActive: true,
                hoursAfter: 0
            }
        });

        const requiredPath = path.join(__dirname, `../../../emails_templates/criacao_de_super_administrador.ejs`);

        const data_templates = await prismaClient.emailTemplate.findFirst({
            where: {
                templateName: "criacao_de_super_administrador.ejs"
            }
        });

        const domain_site = process.env.URL_ECOMMERCE;
        const domain_api = process.env.URL_API;

        const data = await ejs.renderFile(requiredPath, {
            name_user: user_create_super_admin.name,
            logo: infos_ecommerce?.logo,
            name_ecommerce: infos_ecommerce?.name,
            domain_site: domain_site,
            domain_api: domain_api
        });

        await transporter.sendMail({
            from: `"${infos_ecommerce?.name} " <${infos_ecommerce?.email}>`,
            to: user_create_super_admin.email,
            subject: `${data_templates?.subject}`,
            html: data
        });

        return user_create_super_admin;

    }

}

export { UserCreateService }