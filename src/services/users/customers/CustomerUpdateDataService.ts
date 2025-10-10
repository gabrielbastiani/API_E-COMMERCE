import { StatusCustomer, TypeUser } from '@prisma/client';
import prismaClient from '../../../prisma';
import fs from 'fs';
import path from 'path';
import { hash } from 'bcryptjs';

interface UserRequest {
    customer_id: string;
    name?: string;
    email?: string;
    photo?: string;
    status?: string;
    password?: string;
    phone?: string;
    type_user?: string;
    cpf?: string;
    cnpj?: string;
    date_of_birth?: string;
    sexo?: string;
    state_registration?: string;
    newsletter?: string;
}

class CustomerUpdateDataService {
    async execute({
        customer_id,
        name,
        email,
        photo,
        status,
        password,
        phone,
        type_user,
        cpf,
        cnpj,
        date_of_birth,
        sexo,
        state_registration,
        newsletter
    }: UserRequest) {

        const customer = await prismaClient.customer.findUnique({
            where: { id: customer_id }
        });

        if (!customer) {
            throw new Error("User not found");
        }

        const dataToUpdate: any = {};

        if (name) {
            dataToUpdate.name = name;
        }

        if (phone) {
            dataToUpdate.phone = phone;
        }

        if (type_user) {
            dataToUpdate.type_user = type_user as TypeUser
        }

        if (cpf) {
            dataToUpdate.cpf = cpf;
        }

        if (cnpj) {
            dataToUpdate.cnpj = cnpj;
        }

        if (date_of_birth) {
            dataToUpdate.date_of_birth = date_of_birth;
        }

        if (sexo) {
            dataToUpdate.sexo = sexo;
        }

        if (state_registration !== undefined) {
            dataToUpdate.state_registration = state_registration;
        }

        if (newsletter !== undefined) {
            dataToUpdate.newsletter = newsletter === "true";
        }

        if (email) {
            const userAlreadyExists = await prismaClient.customer.findFirst({
                where: {
                    email: email,
                    id: { not: customer_id }
                }
            });

            if (userAlreadyExists) {
                throw new Error("User already exists");
            }

            dataToUpdate.email = email;
        }

        if (photo) {
            if (customer.photo) {
                const imagePath = path.resolve(__dirname  + '/' + '..' + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + 'customer' + '/' + customer.photo);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete old image: ${err.message}`);
                    } else {
                        console.log('Old image deleted successfully');
                    }
                });
            }
            dataToUpdate.photo = photo;
        }

        if (status) {
            dataToUpdate.status = status as StatusCustomer;
        }

        if (password) {
            const hashedPassword = await hash(password, 8);
            dataToUpdate.password = hashedPassword;
        }

        const update_user = await prismaClient.customer.update({
            where: {
                id: customer_id
            },
            data: dataToUpdate
        });

        return update_user;
    }
}

export { CustomerUpdateDataService };