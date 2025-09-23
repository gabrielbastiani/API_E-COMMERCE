import prismaClient from "../../prisma";

interface ConfigBlog {
    name: string;
    email: string;
    logo: string;
    favicon?: string;
}

class CreateConfigurationService {
    async execute({ name, email, logo, favicon }: ConfigBlog) {

        const config = await prismaClient.ecommerceData.create({
            data: {
                name: name,
                email: email,
                logo: logo,
                favicon: favicon,
                phone: "(99) 99999-9999",
                whatsapp: "(99) 99999-9999",
                street: "Rua XXXXX",
                city: "cidade",
                state: "US",
                zipCode: "99999-999",
                number: "0000",
                neighborhood: "Bairro",
                country: "Brasil",
                exchanges_and_returns: "Trocas e devoluções",
                how_to_buy: "Como comprar",
                shipping_delivery_time: "Prazo de entregas",
                faq: "Perguntas e respostas",
                payment_methods: "Metodos de pagamentos",
                technical_assistance: null,
                about_store: "Escreva uma descrição para a loja, do que se trata...",
                resume_about_store: "Escreva um resumo da descrição sobre a loja...",
                privacy_policies: "Escrveva aqui seu texto das suas politicas de privacidades focado na lei LGPD"
            }
        })

        return config;

    }
}

export { CreateConfigurationService }