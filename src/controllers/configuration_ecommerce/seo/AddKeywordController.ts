import { Request, Response } from 'express';
import prismaClient from '../../../prisma';

class AddKeywordController {
    async handle(req: Request, res: Response) {
        const { sEOSettings_id, keyword } = req.body;

        try {
            const settings = await prismaClient.sEOSettings.findUnique({
                where: { id: sEOSettings_id }
            });

            if (!settings) {
                res.status(404).json({ error: "Configuração SEO não encontrada" });
            }

            const keywords = settings!.keywords as string[];
            keywords.push(keyword); // Adiciona a nova keyword

            await prismaClient.sEOSettings.update({
                where: { id: sEOSettings_id },
                data: { keywords }
            });

            res.json({ success: true });

        } catch (error) {
            res.status(500).json({ error: "Erro ao adicionar palavra-chave" });
        }
    }
}

export { AddKeywordController };