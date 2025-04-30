import { Request, Response } from 'express';
import { ExportDataService } from '../../services/export_data/ExportDataService';
import prismaClient from '../../prisma';

class ExportDataController {
    async handle(req: Request, res: Response) {
        try {
            const { userEcommerce_id, tableName, columns, format, customColumnNames } = req.body;

            // Lista de todos os modelos Prisma disponíveis
            const prismaModels = Object.keys(prismaClient).filter(
                key => typeof (prismaClient as any)[key]?.findMany === 'function'
            );

            if (!prismaModels.includes(tableName)) {
                res.status(400).json({ error: "Tabela não encontrada ou não permitida" });
            }

            if (!Array.isArray(columns) || columns.length === 0) {
                res.status(400).json({ error: "Selecione pelo menos uma coluna" });
            }

            const exportDataService = new ExportDataService();
            const { buffer, mimeType, extension } = await exportDataService.execute(
                userEcommerce_id,
                tableName,
                columns,
                format,
                customColumnNames
            );

            res.setHeader('Content-Disposition', `attachment; filename=export_${tableName}_${Date.now()}.${extension}`);
            res.setHeader('Content-Type', mimeType);
            
            res.send(buffer);

        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

export { ExportDataController };