import prismaClient from '../../prisma';
import fs from 'fs';
import path from 'path';

interface ConfigEcommerce {
    ecommerceData_id: string;
    name?: string;
    cnpj?: string;
    cpf?: string;
    whatsapp?: string;
    logo?: string;
    favicon?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    street?: string;
    zipCode?: string;
    number?: string;
    neighborhood?: string;
    country?: string;
    privacy_policies?: string;
    about_store?: string;
    exchanges_and_returns?: string;
    how_to_buy?: string;
    shipping_delivery_time?: string;
    faq?: string;
    payment_methods?: string;
    technical_assistance?: string;
}

class UpdateConfigurationEcommerceService {
    async execute({
        ecommerceData_id,
        name,
        whatsapp,
        logo,
        favicon,
        phone,
        cnpj,
        cpf,
        email,
        city,
        state,
        street,
        zipCode,
        number,
        neighborhood,
        country,
        privacy_policies,
        about_store,
        exchanges_and_returns,
        how_to_buy,
        shipping_delivery_time,
        faq,
        payment_methods,
        technical_assistance
    }: ConfigEcommerce) {

        const ecommerceData = await prismaClient.ecommerceData.findUnique({
            where: { id: ecommerceData_id }
        });

        const dataToUpdate: any = {};

        if (name) {
            dataToUpdate.name = name;
        }

        if (street) {
            dataToUpdate.street = street;
        }

        if (number) {
            dataToUpdate.number = number;
        }

        if (cnpj) {
            dataToUpdate.cnpj = cnpj;
        }

        if (cpf) {
            dataToUpdate.cpf = cpf;
        }

        if (neighborhood) {
            dataToUpdate.neighborhood = neighborhood;
        }

        if (country) {
            dataToUpdate.country = country;
        }

        if (privacy_policies) {
            dataToUpdate.privacy_policies = privacy_policies;
        }

        if (about_store) {
            dataToUpdate.about_store = about_store;
        }

        if (exchanges_and_returns) {
            dataToUpdate.exchanges_and_returns = exchanges_and_returns;
        }

        if (how_to_buy) {
            dataToUpdate.how_to_buy = how_to_buy;
        }

        if (zipCode) {
            dataToUpdate.zipCode = zipCode;
        }

        if (whatsapp) {
            dataToUpdate.whatsapp = whatsapp;
        }

        if (shipping_delivery_time) {
            dataToUpdate.shipping_delivery_time = shipping_delivery_time;
        }

        if (faq) {
            dataToUpdate.faq = faq;
        }

        if (payment_methods) {
            dataToUpdate.payment_methods = payment_methods;
        }

        if (technical_assistance) {
            dataToUpdate.technical_assistance = technical_assistance;
        }

        if (state) {
            dataToUpdate.state = state;
        }

        if (logo) {
            if (ecommerceData?.logo) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + ecommerceData?.logo);
                console.log(`Deleting image: ${imagePath}`);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete old image: ${err.message}`);
                    } else {
                        console.log('Old image deleted successfully');
                    }
                });
            }
            dataToUpdate.logo = logo;
        }

        if (favicon) {
            if (ecommerceData?.favicon) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + ecommerceData?.favicon);
                console.log(`Deleting image: ${imagePath}`);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete old image: ${err.message}`);
                    } else {
                        console.log('Old image deleted successfully');
                    }
                });
            }
            dataToUpdate.favicon = favicon;
        }

        if (phone) {
            dataToUpdate.phone = phone;
        }

        if (email) {
            dataToUpdate.email = email;
        }

        if (city) {
            dataToUpdate.city = city;
        }

        const update_Configs = await prismaClient.ecommerceData.update({
            where: {
                id: ecommerceData_id
            },
            data: dataToUpdate
        });

        return update_Configs;
    }
}

export { UpdateConfigurationEcommerceService };