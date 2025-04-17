import ExcelJS from "exceljs";
import prismaClient from "../../../prisma";
import { NotificationType } from "@prisma/client";

interface UserProps {
    userEcommerce_id: string;
}

class GenerateExcelService {
    async execute({ userEcommerce_id }: UserProps) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("UsersEcommerce");

        worksheet.columns = [
            { header: "Nome", key: "name", width: 80 },
            { header: "Email", key: "email", width: 80 },
            { header: "Senha", key: "senha", width: 80 },
            { header: "Role", key: "role", width: 80 },
        ];

        const users = [
            { name: "João Silva", email: "joao.silva@example.com", senha: "admin", role: "EMPLOYEE" },
            { name: "Maria Oliveira", email: "maria.oliveira@example.com", senha: "admin", role: "EMPLOYEE" },
        ];

        users.forEach((user) => {
            worksheet.addRow(user);
        });

        await prismaClient.notificationUserEcommerce.create({
            data: {
                userEcommerce_id: userEcommerce_id,
                message: "Planilha de modelo de importação de usuarios gerada com suscesso",
                type: NotificationType.REPORT
            }
        });

        return workbook;
    }
}

export { GenerateExcelService };