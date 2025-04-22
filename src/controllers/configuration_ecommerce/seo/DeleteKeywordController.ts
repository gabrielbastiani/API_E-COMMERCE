import { Request, Response } from 'express';
import prismaClient from '../../../prisma';

class DeleteKeywordController {
    async handle(req: Request, res: Response) {
        const { sEOSettings_id, keywordIndex } = req.body;

        try {
            const settings = await prismaClient.sEOSettings.findUnique({
                where: { id: sEOSettings_id }
            });

            if (!settings) {
                res.status(404).json({ error: "Configuração SEO não encontrada" });
            }

            const keywords = settings!.keywords as string[];
            keywords.splice(keywordIndex, 1); // Remove a keyword pelo índice

            await prismaClient.sEOSettings.update({
                where: { id: sEOSettings_id },
                data: { keywords }
            });

            res.json({ success: true });

        } catch (error) {
            res.status(500).json({ error: "Erro ao deletar palavra-chave" });
        }
    }
}

export { DeleteKeywordController };