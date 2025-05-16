import { Request, Response } from "express";
import { ProductUpdateDataService } from "../../services/product/ProductUpdateDataService";

export class ProductUpdateDataController {
    private service = new ProductUpdateDataService();

    public handle = async (req: Request, res: Response) => {
        try {
            const files = (req.files as Record<string, Express.Multer.File[]>) || {};
            const globalImages = files["imageFiles"] || [];
            const variantFiles = files["variantImageFiles"] || [];

            const {
                id, name, slug, metaTitle, metaDescription, keywords, brand, ean, description,
                skuMaster, price_per, price_of, weight, length, width, height, stock,
                mainPromotion_id, categoryIds, descriptionBlocks, videoUrls,
                variants, relations, status
            } = req.body;

            const parseSafe = (str: string) => str ? JSON.parse(str) : undefined;

            // 1. parse dos campos que vêm como string
            const rawVariants = parseSafe(req.body.variants);
            // 2. decisao se vamos mesmo atualizar variantes
            const shouldUpdateVariants = Array.isArray(rawVariants) && rawVariants.length > 0;

            const variantsWithFiles = shouldUpdateVariants
                ? rawVariants.map((v: any, idx: number) => ({
                    ...v,
                    imageFiles: variantFiles.filter(f => f.fieldname === "variantImageFiles" /* ou outra lógica */)
                }))
                : undefined;

            const updateDto = {
                id,
                name,
                slug,
                metaTitle,
                metaDescription,
                keywords: parseSafe(keywords),
                brand,
                ean,
                description,
                skuMaster,
                price_per: parseFloat(price_per),
                price_of: parseFloat(price_of),
                weight: parseFloat(weight),
                length: parseFloat(length),
                width: parseFloat(width),
                height: parseFloat(height),
                stock: parseFloat(stock),
                status,
                mainPromotion_id,
                categoryIds: parseSafe(categoryIds),
                descriptionBlocks: parseSafe(descriptionBlocks),
                relations: parseSafe(relations),
                videoUrls: parseSafe(videoUrls),
                variants: variantsWithFiles,
                variantImageFiles: variantFiles,
                imageFiles: globalImages,
            };

            const updatedProduct = await this.service.execute(updateDto);
            res.json(updatedProduct);
        } catch (err: any) {
            console.error('Update error:', err);
            res.status(400).json({
                error: err.message || "Failed to update product",
                details: err.response?.data || err.stack
            });
        }
    };
}