import { Request, Response } from "express";
import { CreateProductService } from "../../services/product/CreateProductService";

class CreateProductController {
    async handle(req: Request, res: Response) {
        try {
            const service = new CreateProductService();
            const {
                name,
                slug,
                metaTitle,
                metaDescription,
                keywords,
                brand,
                ean,
                description,
                skuMaster,
                price_per,
                price_of,
                weight,
                length,
                width,
                height,
                stock,
                mainPromotion_id,
                categoryIds,
                descriptionBlocks,
                videoUrls,
                variants,
                relations,
            } = req.body;

            const files = req.files as Record<string, Express.Multer.File[]>;

            // desserialização
            const parsedKeywords = keywords ? JSON.parse(keywords) : undefined;
            const parsedDescriptions = descriptionBlocks
                ? JSON.parse(descriptionBlocks)
                : undefined;
            const parsedVideoUrls: string[] | undefined =
                typeof videoUrls === "string"
                    ? [videoUrls]
                    : Array.isArray(videoUrls)
                        ? videoUrls
                        : undefined;
            const parsedVariants = variants ? JSON.parse(variants) : [];
            const parsedRelations = relations ? JSON.parse(relations) : [];

            // agrupa arquivos de imagem/variant
            const variantFiles = files["variantImageFiles"] || [];
            parsedVariants.forEach((v: any) => (v.imageFiles = []));
            variantFiles.forEach((file) => {
                const [idxStr] = file.originalname.split("___");
                const idx = parseInt(idxStr, 10);
                if (!isNaN(idx) && parsedVariants[idx]) {
                    parsedVariants[idx].imageFiles.push(file);
                }
            });

            const product = await service.execute({
                name,
                slug,
                metaTitle,
                metaDescription,
                keywords: parsedKeywords,
                brand,
                ean,
                description,
                skuMaster,
                price_per: parseFloat(price_per),
                price_of: price_of ? parseFloat(price_of) : undefined,
                weight: weight ? parseFloat(weight) : undefined,
                length: length ? parseFloat(length) : undefined,
                width: width ? parseFloat(width) : undefined,
                height: height ? parseFloat(height) : undefined,
                stock: stock ? parseFloat(stock) : undefined,
                mainPromotion_id,
                categoryIds: categoryIds ? JSON.parse(categoryIds) : undefined,
                descriptionBlocks: parsedDescriptions,
                imageFiles: files["imageFiles"],
                videoUrls: parsedVideoUrls,
                variants: parsedVariants,
                relations: parsedRelations,
            });

            res.status(201).json(product);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

export { CreateProductController };