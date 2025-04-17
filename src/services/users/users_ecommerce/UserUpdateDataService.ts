import { Role, StatusUserEcommerce } from '@prisma/client';
import prismaClient from '../../../prisma';
import fs from 'fs';
import path from 'path';
import { hash } from 'bcryptjs';

interface UserRequest {
    userEcommerce_id: string;
    name?: string;
    email?: string;
    photo?: string;
    role?: string;
    status?: string;
    password?: string;
}

class UserUpdateDataService {
    async execute({ userEcommerce_id, name, email, photo, role, status, password }: UserRequest) {

        const user = await prismaClient.userEcommerce.findUnique({
            where: { id: userEcommerce_id }
        });

        if (!user) {
            throw new Error("User not found");
        }

        const dataToUpdate: any = {};

        if (name) {
            dataToUpdate.name = name;
        }

        if (email) {
            const userAlreadyExists = await prismaClient.userEcommerce.findFirst({
                where: {
                    email: email,
                    id: { not: userEcommerce_id }
                }
            });

            if (userAlreadyExists) {
                throw new Error("User already exists");
            }

            dataToUpdate.email = email;
        }

        if (photo) {
            if (user.photo) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + user.photo);
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

        if (role) {
            dataToUpdate.role = role as Role;
        }

        if (status) {
            dataToUpdate.status = status as StatusUserEcommerce;
        }

        if (password) {
            const hashedPassword = await hash(password, 8);
            dataToUpdate.password = hashedPassword;
        }

        const update_user = await prismaClient.userEcommerce.update({
            where: {
                id: userEcommerce_id
            },
            data: dataToUpdate
        });

        return update_user;
    }
}

export { UserUpdateDataService };