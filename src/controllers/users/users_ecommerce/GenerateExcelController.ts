import { Request, Response } from 'express';
import { GenerateExcelService } from '../../../services/users/users_ecommerce/GenerateExcelService'; 

class GenerateExcelController {
    async handle(req: Request, res: Response) {

        const userEcommerce_id = req.query.userEcommerce_id as string;
        
        try {
            const generateExcelService = new GenerateExcelService();
            const workbook = await generateExcelService.execute({ userEcommerce_id });

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", "attachment; filename=modelo_de dados.xlsx");

            await workbook.xlsx.write(res);

            res.end();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Erro ao gerar o arquivo Excel." });
        }
    }
}

export { GenerateExcelController };