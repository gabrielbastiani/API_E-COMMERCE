import { Request, Response } from 'express';
import { ExportDataService } from '../../services/export_data/ExportDataService';

class ExportDataController {
    async handle(req: Request, res: Response) {
        const { userEcommerce_id, tableName, columns, format, customColumnNames } = req.body;

        // Lista de modelos permitidos (nomes dos modelos Prisma)
        const allowedModels = [
            'userEcommerce',  // Nome do modelo Prisma (não o nome da tabela)
            'customer',
            'product',
            'order',
            'promotion',
            'category',
            'payment',
            'productVariant'
        ];

        if (!allowedModels.includes(tableName)) {
            res.status(400).json({ error: "Tabela não permitida para exportação" });
        }

        if (!Array.isArray(columns) || columns.some(col => typeof col !== 'string')) {
            res.status(400).json({ error: "Parâmetro 'columns' inválido" });
        }

        if (!['xlsx', 'csv'].includes(format)) {
            res.status(400).json({ error: "Formato inválido" });
        }

        const exportDataService = new ExportDataService();

        try {
            const { buffer, mimeType, extension } = await exportDataService.execute(
                userEcommerce_id,
                tableName,
                columns,
                format,
                customColumnNames
            );

            const filename = `export_${tableName}_${Date.now()}.${extension}`;

            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', mimeType);

            res.send(buffer);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

export { ExportDataController };