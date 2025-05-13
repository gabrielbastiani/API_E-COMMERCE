import { Request, Response } from "express";
import { ProductUpdateDataService } from "../../services/product/ProductUpdateDataService";

export class ProductUpdateDataController {
    private service = new ProductUpdateDataService();

    public handle = async (req: Request, res: Response) => {
        try {
            // 1) mantém undefined se não houve upload)
            const files = (req.files as Record<string, Express.Multer.File[]>) || {};
            const globalImages  = files["imageFiles"];        // undefined | File[]
            const variantFiles  = files["variantImageFiles"]; // undefined | File[]

            // 2) Extrai body
            const {
                id,
                name, slug, metaTitle, metaDescription, keywords, brand, ean, description,
                skuMaster, price_per, price_of, weight, length, width, height, stock,
                mainPromotion_id, categoryIds, descriptionBlocks, videoUrls,
                variants, relations, status   // <= agora incluímos status
            } = req.body;

            // 3) Desserializa JSON quando necessário
            const parsedKeywords = keywords ? JSON.parse(keywords) : undefined;
            const parsedDescBlocks = descriptionBlocks ? JSON.parse(descriptionBlocks) : undefined;
            const parsedVideoUrls = typeof videoUrls === "string"
                ? [videoUrls]
                : Array.isArray(videoUrls) ? videoUrls : undefined;
            const parsedVariants = variants ? JSON.parse(variants) : undefined;
            const parsedRelations = relations ? JSON.parse(relations) : undefined;

            // 4) Agrupa arquivos de variante
            if (parsedVariants && variantFiles.length) {
                parsedVariants.forEach((v: { imageFiles: never[]; }) => (v.imageFiles = []));
                variantFiles.forEach(file => {
                    const [idxStr] = file.originalname.split("___");
                    const idx = parseInt(idxStr, 10);
                    if (!isNaN(idx) && parsedVariants[idx]) {
                        parsedVariants[idx].imageFiles.push(file);
                    }
                });
            }

            // 5) Monta DTO
            const updateDto = {
                id,
                name, slug, metaTitle, metaDescription, keywords: parsedKeywords,
                brand, ean, description, skuMaster,
                price_per: price_per ? parseFloat(price_per) : undefined,
                price_of: price_of ? parseFloat(price_of) : undefined,
                weight: weight ? parseFloat(weight) : undefined,
                length: length ? parseFloat(length) : undefined,
                width: width ? parseFloat(width) : undefined,
                height: height ? parseFloat(height) : undefined,
                stock: stock ? parseFloat(stock) : undefined,
                mainPromotion_id,
                status,                                 // <= incluímos status
                categoryIds: categoryIds ? JSON.parse(categoryIds) : undefined,
                descriptionBlocks: parsedDescBlocks,
                relations: parsedRelations,
                imageFiles: globalImages,
                videoUrls: parsedVideoUrls,
                variants: parsedVariants,
            };

            // 6) Executa serviço
            const updated = await this.service.execute(updateDto);

            res.json(updated);
        } catch (err: any) {
            console.error(err);
            res.status(400).json({ error: err.message || "Failed to update product." });
        }
    };
}
