import ExcelJS from "exceljs";
import prismaClient from "../../prisma";
import { NotificationType } from "@prisma/client";

interface PublicationProps {
    userEcommerce_id: string;
}

class GenerateExcelDeletePublicationService {
    async execute({ userEcommerce_id }: PublicationProps) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("MarketingPublication");

        worksheet.columns = [
            { header: "Nome", key: "title", width: 80 }
        ];

        const publications = [
            { title: "Publicidade no banner home" }
        ];

        publications.forEach((publi) => {
            worksheet.addRow(publi);
        });

        await prismaClient.notificationUserEcommerce.create({
            data: {
                userEcommerce_id: userEcommerce_id,
                message: "Planilha de modelo de importação para deletar as publicações de marketing gerada com suscesso",
                type: NotificationType.MARKETING
            }
        });

        return workbook;
    }
}

export { GenerateExcelDeletePublicationService };