import { StatusCategory } from '@prisma/client';
import prismaClient from '../../prisma';
import fs from 'fs';
import path from 'path';

interface CategoryProps {
    category_id: string;
    name?: string;
    description?: string;
    image?: string;
    status?: string;
    parentId?: string;
    order?: number;
}

class CategoryUpdateDataService {
    async execute({ category_id, name, description, image, status, parentId, order }: CategoryProps) {

        function removerAcentos(s: any) {
            return s.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/[/]/g, "-");
        }

        const category = await prismaClient.category.findUnique({
            where: { id: category_id }
        });

        const dataToUpdate: any = {};

        if (name) {
            dataToUpdate.name = name;
            dataToUpdate.slug = removerAcentos(name);
        }

        if (description) {
            dataToUpdate.description = description;
        }

        if (image) {
            if (category?.image) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + 'category' + '/' + category?.image);
                console.log(`Deleting image: ${imagePath}`);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete old image: ${err.message}`);
                    } else {
                        console.log('Old image deleted successfully');
                    }
                });
            }
            dataToUpdate.image = image;
        }

        if (status) {
            dataToUpdate.status = status as StatusCategory;
        }

        if (parentId) {
            dataToUpdate.parentId = parentId;
        }

        if (order) {
            dataToUpdate.order = Number(order);
        }

        const update_category = await prismaClient.category.update({
            where: {
                id: category_id
            },
            data: dataToUpdate
        });

        return update_category;
    }
}

export { CategoryUpdateDataService };