import { NotificationType, Role } from "@prisma/client";
import prismaClient from "../../prisma";
import ExcelJS from "exceljs";
import fs from "fs";

class BulkCategoryImportService {
    async execute(filePath: string, userEcommerce_id: string) {
        const workbook = new ExcelJS.Workbook();

        try {
            await workbook.xlsx.readFile(filePath);
        } catch (error) {
            throw new Error("Failed to read Excel file");
        }

        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            throw new Error("No worksheet found in Excel file");
        }

        const categories: any = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const [_, name, description, status, parentId] = row.values as (string | null)[];

            if (!name) {
                console.warn(`Row ${rowNumber} is missing the category name.`);
                return;
            }

            function removerAcentos(s: string) {
                return s
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/ +/g, "-")
                    .replace(/-{2,}/g, "-")
                    .replace(/[/]/g, "-");
            }

            categories.push({
                name,
                slug: removerAcentos(name),
                description: description || null,
                parentId: parentId || null,
                status: status || "Unavailable",
            });
        });

        const createdCategories = [];

        for (const category of categories) {
            let parentCategoryId = null;

            // Se `parentId` for fornecido e não for um UUID, buscar o ID correspondente
            if (category.parentId && !this.isUUID(category.parentId)) {
                const parentCategory = await prismaClient.category.findUnique({
                    where: { name: category.parentId },
                });

                if (parentCategory) {
                    parentCategoryId = parentCategory.id;
                } else {
                    console.warn(`Parent category "${category.parentId}" not found.`);
                }
            } else {
                parentCategoryId = category.parentId;
            }

            const newCategory = await prismaClient.category.create({
                data: {
                    name: category.name,
                    slug: category.slug,
                    description: category.description,
                    parentId: parentCategoryId,
                    status: category.status,
                },
            });

            createdCategories.push(newCategory);
        }

        const users_crate = await prismaClient.userEcommerce.findUnique({
            where: {
                id: userEcommerce_id
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
            message: `Categoria(s) criada(s) via planilha pelo usuario ${users_crate?.name}`,
            type: NotificationType.CATEGORY
        }));

        try {
            await prismaClient.notificationUserEcommerce.createMany({
                data: notificationsData
            });
        } catch (error) {
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error("Failed to delete file:", err);
                } else {
                    console.log("File deleted successfully");
                }
            });
        }

        // Retornar as categorias criadas
        return createdCategories;
    }

    private isUUID(uuid: string): boolean {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return regex.test(uuid);
    }
}

export { BulkCategoryImportService };