import { Request, Response } from 'express';
import prismaClient from '../../../prisma';

class AddTwitterImagesController {
    async handle(req: Request, res: Response) {
        const { sEOSettings_id } = req.body;
        const files = req.files as Express.Multer.File[];

        try {
            const settings = await prismaClient.sEOSettings.findUnique({
                where: { id: sEOSettings_id }
            });

            if (!settings) res.status(404).json({ error: "Configuração não encontrada" });

            const currentImages = settings!.twitterImages as string[];
            const newImages = files.map(file => file.filename);

            await prismaClient.sEOSettings.update({
                where: { id: sEOSettings_id },
                data: { twitterImages: [...currentImages, ...newImages] }
            });

            res.json({ newImages });

        } catch (error) {
            res.status(500).json({ error: "Erro ao adicionar imagens OG" });
        }
    }
}

export { AddTwitterImagesController }