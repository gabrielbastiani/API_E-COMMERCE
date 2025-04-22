import { Request, Response } from 'express';
import prismaClient from '../../../prisma';
import fs from 'fs/promises';
import path from 'path';

const IMAGE_UPLOAD_DIR = path.join(process.cwd(), 'images');

class DeleteTwitterImageController {
    async handle(req: Request, res: Response) {
        const { sEOSettings_id, imageIndex } = req.body;

        try {
            const settings = await prismaClient.sEOSettings.findUnique({
                where: { id: sEOSettings_id }
            });

            if (!settings) res.status(404).json({ error: "Configuração não encontrada" });

            const images = settings!.twitterImages as string[];
            const imageToDelete = images[imageIndex];

            if (!imageToDelete) res.status(404).json({ error: "Imagem não encontrada" });

            // Deletar arquivo físico
            await fs.unlink(path.join(IMAGE_UPLOAD_DIR, imageToDelete));

            // Atualizar banco
            const updatedImages = images.filter((_, i) => i !== imageIndex);
            await prismaClient.sEOSettings.update({
                where: { id: sEOSettings_id },
                data: { twitterImages: updatedImages }
            });

            res.json({ success: true });

        } catch (error) {
            res.status(500).json({ error: "Erro ao remover imagem OG" });
        }
    }
}

export { DeleteTwitterImageController }