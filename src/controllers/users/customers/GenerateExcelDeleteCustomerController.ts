import { Request, Response } from 'express';
import { GenerateExcelDeleteCustomerService } from '../../../services/users/customers/GenerateExcelDeleteCustomerService'; 

class GenerateExcelDeleteCustomerController {
    async handle(req: Request, res: Response) {

        const userEcommerce_id = req.query.userEcommerce_id as string;
        
        try {
            const generateExcelService = new GenerateExcelDeleteCustomerService();
            const workbook = await generateExcelService.execute({ userEcommerce_id });

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", "attachment; filename=modelo_de_dados.xlsx");

            await workbook.xlsx.write(res);

            res.end();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Erro ao gerar o arquivo Excel." });
        }
    }
}

export { GenerateExcelDeleteCustomerController };