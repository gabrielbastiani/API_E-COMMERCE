import { Request, Response } from "express";
import { CreateProductService } from "../../services/product/CreateProductService";
import { ProductRelationType } from "@prisma/client";

class CreateProductController {
    async handle(req: Request, res: Response) {
        try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            const safeParse = (raw?: any) => {
                if (raw === undefined || raw === null) return [];
                if (typeof raw === 'string') {
                    try {
                        return JSON.parse(raw);
                    } catch (e) {
                        console.error('Erro ao parsear JSON:', raw);
                        return [];
                    }
                }
                return Array.isArray(raw) ? raw : [];
            };

            const variants = safeParse(req.body.variants).map((variant: any) => ({
                ...variant,
                videoLinks: safeParse(variant.videoLinks).filter((url: any) => typeof url === 'string')
            }));

            const rawRelations = safeParse(req.body.relations) as any[];
            const relations = rawRelations.map((r) => ({
                relationDirection: r.relationDirection as "child" | "parent",
                relatedProductId: r.relatedProductId as string,
                relationType: r.relationType as ProductRelationType,
                sortOrder: r.sortOrder ? Number(r.sortOrder) : undefined,
                isRequired: !!r.isRequired,
            }));

            const productData = {
                ...req.body,
                price_of: Number(req.body.price_of),
                price_per: Number(req.body.price_per),
                weight: req.body.weight ? Number(req.body.weight) : undefined,
                length: req.body.length ? Number(req.body.length) : undefined,
                width: req.body.width ? Number(req.body.width) : undefined,
                height: req.body.height ? Number(req.body.height) : undefined,
                stock: req.body.stock ? Number(req.body.stock) : undefined,
                mainPromotion_id: req.body.mainPromotion_id,
                keywords: safeParse(req.body.keywords),
                categories: safeParse(req.body.categories),
                descriptions: safeParse(req.body.productDescriptions),
                variants: variants,
                videoLinks: safeParse(req.body.videoLinks).filter((url: any) => typeof url === 'string'),
                relations
            };

            const createProductService = new CreateProductService();
            const product = await createProductService.execute(productData, files);

            res.json(product);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

export { CreateProductController };