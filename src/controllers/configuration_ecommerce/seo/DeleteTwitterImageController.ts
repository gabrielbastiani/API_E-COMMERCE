import { Request, Response } from 'express';
import prismaClient from '../../../prisma';
import fs from 'fs/promises';
import path from 'path';

const IMAGE_UPLOAD_DIR = path.resolve(process.cwd(), 'images', 'seo');

class DeleteTwitterImageController {
    async handle(req: Request, res: Response) {
        try {
            const { sEOSettings_id } = req.body;
            let imageIndex = req.body.imageIndex;

            if (!sEOSettings_id) {
                res.status(400).json({ error: "sEOSettings_id é obrigatório" });
            }

            imageIndex = Number(imageIndex);
            if (Number.isNaN(imageIndex) || imageIndex < 0) {
                res.status(400).json({ error: "imageIndex inválido" });
            }

            const settings = await prismaClient.sEOSettings.findUnique({
                where: { id: sEOSettings_id }
            });

            if (!settings) {
            res.status(404).json({ error: "Configuração não encontrada" });
            }

            const images = Array.isArray(settings?.twitterImages) ? settings.twitterImages as string[] : [];
            const imageToDelete = images[imageIndex];

            if (!imageToDelete) {
                res.status(404).json({ error: "Imagem não encontrada" });
            }

            const imagePath = path.join(IMAGE_UPLOAD_DIR, imageToDelete);

            // Tentar deletar o arquivo físico; ignorar se já não existir (ENOENT)
            try {
                await fs.unlink(imagePath);
            } catch (err: any) {
                if (err && err.code === 'ENOENT') {
                    console.warn(`Arquivo não encontrado ao tentar deletar: ${imagePath}. Prosseguindo com atualização do DB.`);
                } else {
                    console.error("Erro ao deletar arquivo Twitter:", err);
                    res.status(500).json({ error: "Erro ao deletar arquivo físico da imagem" });
                }
            }

            // Atualizar banco de dados removendo a imagem
            const updatedImages = images.filter((_, i) => i !== imageIndex);
            const updated = await prismaClient.sEOSettings.update({
                where: { id: sEOSettings_id },
                data: { twitterImages: updatedImages }
            });

            res.json({ success: true, twitterImages: updated.twitterImages ?? updatedImages });

        } catch (error) {
            console.error("Erro no DeleteTwitterImageController:", error);
            res.status(500).json({ error: "Erro ao remover imagem Twitter" });
        }
    }
}

export { DeleteTwitterImageController }