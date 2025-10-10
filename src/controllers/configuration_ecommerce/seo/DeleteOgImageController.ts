import { Request, Response } from 'express';
import prismaClient from '../../../prisma';
import fs from 'fs/promises';
import path from 'path';

const IMAGE_UPLOAD_DIR = path.resolve(process.cwd(), 'images', 'seo');

class DeleteOgImageController {
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

            const images = Array.isArray(settings?.ogImages) ? settings.ogImages as string[] : [];
            const imageToDelete = images[imageIndex];

            if (!imageToDelete) {
                res.status(404).json({ error: "Imagem não encontrada" });
            }

            const imagePath = path.join(IMAGE_UPLOAD_DIR, imageToDelete);

            // Tentar deletar o arquivo, mas não falhar se o arquivo já tiver sumido.
            try {
                await fs.unlink(imagePath);
            } catch (err: any) {
                // Se não existe, apenas logue e prossiga para atualizar o DB
                if (err && err.code === 'ENOENT') {
                    console.warn(`Arquivo não encontrado ao tentar deletar: ${imagePath}. Prosseguindo para atualizar DB.`);
                } else {
                    // Erro real ao tentar deletar
                    console.error("Erro ao deletar arquivo OG:", err);
                    res.status(500).json({ error: "Erro ao deletar arquivo físico da imagem" });
                }
            }

            // Atualizar banco
            const updatedImages = images.filter((_, i) => i !== imageIndex);
            const updated = await prismaClient.sEOSettings.update({
                where: { id: sEOSettings_id },
                data: { ogImages: updatedImages }
            });

            res.json({ success: true, ogImages: updated.ogImages ?? updatedImages });

        } catch (error) {
            console.error("Erro no DeleteOgImageController:", error);
            res.status(500).json({ error: "Erro ao remover imagem OG" });
        }
    }
}

export { DeleteOgImageController }