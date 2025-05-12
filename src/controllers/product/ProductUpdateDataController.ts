import { Request, Response } from "express";
import { ProductUpdateDataService } from "../../services/product/ProductUpdateDataService";

export class ProductUpdateDataController {
    private service = new ProductUpdateDataService();

    public handle = async (req: Request, res: Response) => {
        const { id } = req.params;

        try {
            // 1) Extrai arquivos do multer
            const files = req.files as Record<string, Express.Multer.File[]>;
            const globalImages = files["imageFiles"] || [];
            const variantFiles = files["variantImageFiles"] || [];

            // 2) Desconstrói body e desserializa JSON onde necessário
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
                status
            } = req.body;

            const parsedKeywords = keywords ? JSON.parse(keywords) : undefined;
            const parsedDescriptions = descriptionBlocks ? JSON.parse(descriptionBlocks) : undefined;
            const parsedVideoUrls: string[] | undefined =
                typeof videoUrls === "string"
                    ? [videoUrls]
                    : Array.isArray(videoUrls)
                        ? videoUrls
                        : undefined;

            // 3) Desserializa variantes e relações
            const parsedVariants: any[] | undefined = variants ? JSON.parse(variants) : undefined;
            const parsedRelations: any[] | undefined = relations ? JSON.parse(relations) : undefined;

            // 4) Agrupa arquivos de imagem de variante em cada objeto de parsedVariants
            if (parsedVariants && variantFiles.length) {
                // inicializa array de imageFiles em cada variante
                parsedVariants.forEach(v => v.imageFiles = []);

                variantFiles.forEach(file => {
                    // originalname espera o prefixo "{index}___rest"
                    const [idxStr] = file.originalname.split("___");
                    const idx = parseInt(idxStr, 10);
                    if (!isNaN(idx) && parsedVariants[idx]) {
                        parsedVariants[idx].imageFiles.push(file);
                    }
                });
            }

            // 5) Monta DTO para o serviço
            const updateDto = {
                id,
                // campos simples
                name,
                slug,
                metaTitle,
                metaDescription,
                keywords: parsedKeywords,
                brand,
                ean,
                description,
                skuMaster,
                price_per: price_per ? parseFloat(price_per) : undefined,
                price_of: price_of ? parseFloat(price_of) : undefined,
                weight: weight ? parseFloat(weight) : undefined,
                length: length ? parseFloat(length) : undefined,
                width: width ? parseFloat(width) : undefined,
                height: height ? parseFloat(height) : undefined,
                stock: stock ? parseFloat(stock) : undefined,
                mainPromotion_id,
                status,

                // relacionais
                categoryIds: categoryIds ? JSON.parse(categoryIds) : undefined,
                descriptionBlocks: parsedDescriptions,
                relations: parsedRelations,

                // mídias
                imageFiles: globalImages,
                videoUrls: parsedVideoUrls,

                // variantes
                variants: parsedVariants,
            };

            // 6) Chama serviço
            const updatedProduct = await this.service.execute(updateDto);

            res.json(updatedProduct);
        } catch (err: any) {
            console.error(err);
            res.status(400).json({ error: err.message || "Failed to update product." });
        }
    };
}