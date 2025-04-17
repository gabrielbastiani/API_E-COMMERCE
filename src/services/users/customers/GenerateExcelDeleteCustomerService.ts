import ExcelJS from "exceljs";
import prismaClient from "../../../prisma";
import { NotificationType } from "@prisma/client";

interface UserProps {
    userEcommerce_id: string;
}

class GenerateExcelDeleteCustomerService {
    async execute({ userEcommerce_id }: UserProps) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Customer");

        worksheet.columns = [
            { header: "Email", key: "email", width: 80 }
        ];

        const users = [
            { email: "joao.silva@example.com" }
        ];

        users.forEach((user) => {
            worksheet.addRow(user);
        });

        await prismaClient.notificationUserEcommerce.create({
            data: {
                userEcommerce_id: userEcommerce_id,
                message: "Planilha de modelo de importação para deletar clientes gerada com suscesso",
                type: NotificationType.USER
            }
        });

        return workbook;
    }
}

export { GenerateExcelDeleteCustomerService };