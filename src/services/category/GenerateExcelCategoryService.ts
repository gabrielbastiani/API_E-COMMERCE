import ExcelJS from "exceljs";
import prismaClient from "../../prisma";
import { NotificationType } from "@prisma/client";

interface CategoryProps {
    userEcommerce_id: string;
}

class GenerateExcelCategoryService {
    async execute({ userEcommerce_id }: CategoryProps) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Categories");

        worksheet.columns = [
            { header: "Nome da categiria", key: "name", width: 80 },
            { header: "Descrição", key: "description", width: 80 },
            { header: "Status", key: "status", width: 80 },
            { header: "Subcategoria?", key: "parentId", width: 80 },
        ];

        const users = [
            { name: "Motores", description: "Veja aqui tudo relacionado a motores", status: "DISPONIVEL", parentId: "Insira aqui, o nome da categoria que deseja vincular" }
        ];

        users.forEach((category) => {
            worksheet.addRow(category);
        });

        await prismaClient.notificationUserEcommerce.create({
            data: {
                userEcommerce_id: userEcommerce_id,
                message: "Planilha de modelo de importação de categorias gerada com suscesso",
                type: NotificationType.CATEGORY
            }
        });

        return workbook;
    }
}

export { GenerateExcelCategoryService };