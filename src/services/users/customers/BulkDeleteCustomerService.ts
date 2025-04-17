import prismaClient from "../../../prisma";
import * as XLSX from "xlsx";
import fs from "fs";
import { NotificationType, Role } from "@prisma/client";
import path from "path";

class BulkDeleteCustomerService {
    async execute(filePath: string, userEcommerce_id: string) {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const data = XLSX.utils.sheet_to_json<{ Email?: string }>(worksheet);

            const emailsToDelete = data
                .map(customer => customer.Email)
                .filter(email => email !== undefined && email !== null);

            const users = await prismaClient.customer.findMany({
                where: {
                    email: {
                        in: emailsToDelete
                    }
                }
            });

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
                message: `Clientes deletado(s) via planilha pelo usuario ${users_crate?.name}`,
                type: NotificationType.USER
            }));

            const deleteUsers = await prismaClient.customer.deleteMany({
                where: {
                    email: { in: emailsToDelete },
                },
            });

            await prismaClient.notificationUserEcommerce.createMany({
                data: notificationsData
            });

            return deleteUsers;

        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
}

export { BulkDeleteCustomerService };