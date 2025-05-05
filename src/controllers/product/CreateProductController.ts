import { Request, Response } from 'express';
import { CreateProductService } from '../../services/product/CreateProductService';

class CreateProductController {
    async handle(req: Request, res: Response) {
        const {
            name,
            description,
            price_per,
            slug,
            metaTitle,
            metaDescription,
            keywords,
            brand,
            ean,
            price_of,
            weight,
            length,
            width,
            height,
            mainPromotionId,
            categories,
            variants,
            productDescriptions
        } = req.body;

        // Process uploaded files
        const images = (req.files as Express.Multer.File[]).map(file => ({
            url: file.path,
            altText: file.originalname,
            isPrimary: false
        }));

        const createProductService = new CreateProductService();

        try {
            const product = await createProductService.execute({
                name,
                description,
                price_per: parseFloat(price_per),
                slug,
                metaTitle,
                metaDescription,
                keywords: keywords ? JSON.parse(keywords) : undefined,
                brand,
                ean,
                price_of: price_of ? parseFloat(price_of) : undefined,
                weight: weight ? parseFloat(weight) : undefined,
                length: length ? parseFloat(length) : undefined,
                width: width ? parseFloat(width) : undefined,
                height: height ? parseFloat(height) : undefined,
                mainPromotionId,
                categories: JSON.parse(categories || '[]'),
                images,
                variants: JSON.parse(variants || '[]'),
                productDescriptions: JSON.parse(productDescriptions || '[]'),
            });

            res.status(201).json(product);

        } catch (error) {
            res.status(400).json({ error: error });
        }
    }
}

export { CreateProductController };