import { Request, Response } from 'express';
import prismaClient from '../../../prisma';

class AddOgImagesController {
    async handle(req: Request, res: Response) {
        const { sEOSettings_id } = req.body;
        const files = req.files as Express.Multer.File[];

        try {
            const settings = await prismaClient.sEOSettings.findUnique({
                where: { id: sEOSettings_id }
            });

            if (!settings) res.status(404).json({ error: "Configuração não encontrada" });

            const currentImages = settings!.ogImages as string[];
            const newImages = files.map(file => file.filename);

            await prismaClient.sEOSettings.update({
                where: { id: sEOSettings_id },
                data: { ogImages: [...currentImages, ...newImages] }
            });

            res.json({ newImages });

        } catch (error) {
            res.status(500).json({ error: "Erro ao adicionar imagens OG" });
        }
    }
}

export { AddOgImagesController }