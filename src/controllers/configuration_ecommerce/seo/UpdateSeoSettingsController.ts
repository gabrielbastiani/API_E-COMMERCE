import { Request, Response } from 'express';
import { UpdateSeoSettingsService } from '../../../services/configuration_ecommerce/seo/UpdateSeoSettingsService';
import { z } from 'zod';

const updateSchema = z.object({
    sEOSettings_id: z.string().uuid(),
    page: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.string().optional(),
    keywordIndexes: z.string().transform(val => {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed.map(Number) : [];
        } catch {
            [];
        }
    }),
    newKeywords: z.string().transform(val => {
        try {
            return JSON.parse(val);
        } catch {
            [];
        }
    }),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImageWidth: z.coerce.number().optional(),
    ogImageHeight: z.coerce.number().optional(),
    ogImageAlt: z.string().optional(),
    twitterTitle: z.string().optional(),
    twitterDescription: z.string().optional(),
    twitterCreator: z.string().optional(),
    ogImageIndexes: z.string().transform(val => {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed.map(Number) : [];
        } catch {
            [];
        }
    }),
    twitterImageIndexes: z.string().transform(val => {
        try {
            const parsed = JSON.parse(val);
            Array.isArray(parsed) ? parsed.map(Number) : [];
        } catch {
            [];
        }
    }),
});

class UpdateSeoSettingsController {
    async handle(req: Request, res: Response) {
        try {
            const validatedData = await updateSchema.parseAsync({
                ...req.body,
                ogImageIndexes: req.body.ogImageIndexes || '[]',
                twitterImageIndexes: req.body.twitterImageIndexes || '[]',
                keywordIndexes: req.body.keywordIndexes || '[]',
                newKeywords: req.body.newKeywords || '[]'
            });

            // Processar uploads
            /* @ts-ignore */
            const ogImages = req.files?.['ogImages']?.map(file => file.filename) || [];/* @ts-ignore */
            const twitterImages = req.files?.['twitterImages']?.map(file => file.filename) || [];

            // Validações
            if (ogImages.length > validatedData.ogImageIndexes!.length) {
                throw new Error('Mais imagens OG do que índices especificados');
            }

            if (twitterImages.length > validatedData.twitterImageIndexes!.length) {
                throw new Error('Mais imagens Twitter do que índices especificados');
            }

            if (validatedData.newKeywords.length > validatedData.keywordIndexes!.length) {
                throw new Error('Mais keywords do que índices especificados');
            }

            // Montar payload
            const updatePayload = {
                sEOSettings_id: validatedData.sEOSettings_id,
                page: validatedData.page,
                title: validatedData.title,
                description: validatedData.description,
                ogTitle: validatedData.ogTitle,
                ogDescription: validatedData.ogDescription,
                ogImageWidth: validatedData.ogImageWidth,
                ogImageHeight: validatedData.ogImageHeight,
                ogImageAlt: validatedData.ogImageAlt,
                twitterTitle: validatedData.twitterTitle,
                twitterDescription: validatedData.twitterDescription,
                twitterCreator: validatedData.twitterCreator,
                ogImages,
                ogImageIndexes: validatedData.ogImageIndexes,
                twitterImages,
                twitterImageIndexes: validatedData.twitterImageIndexes,
                keywordIndexes: validatedData.keywordIndexes,
                newKeywords: validatedData.newKeywords
            };

            const updateService = new UpdateSeoSettingsService();
            const result = await updateService.execute(updatePayload);

            res.json(result);

        } catch (error: any) {
            console.error('Erro na atualização:', error);
            res.status(400).json({/* @ts-ignore */
                error: error.message || 'Erro ao atualizar configurações SEO',
                details: error.issues || []
            });
        }
    }
}

export { UpdateSeoSettingsController }