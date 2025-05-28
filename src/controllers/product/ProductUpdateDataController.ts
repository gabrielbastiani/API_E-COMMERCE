import { Request, Response } from "express";
import { ProductUpdateDataService } from "../../services/product/ProductUpdateDataService";
import { ProductRelationType, StatusVariant } from "@prisma/client";

export class ProductUpdateDataController {
    async handle(req: Request, res: Response) {
        try {
            const files = req.files as { [field: string]: Express.Multer.File[] };

            const safeParse = (raw?: any) => {
                if (raw == null) return [];
                if (typeof raw === "string") {
                    try {
                        return JSON.parse(raw);
                    } catch {
                        return [];
                    }
                }
                return Array.isArray(raw) ? raw : [];
            };

            // monta variants
            const variants = safeParse(req.body.variants).map((v: any) => ({
                ...v,
                videoLinks: safeParse(v.videoLinks).filter((u: any) => typeof u === "string"),
                images: safeParse(v.images),
                attributes: safeParse(v.attributes).map((a: any) => ({
                    ...a,
                    images: safeParse(a.images),
                })),
            }));

            // monta relations
            const relations = (safeParse(req.body.relations) as any[]).map((r) => ({
                relationDirection: r.relationDirection as "child" | "parent",
                relatedProductId: r.relatedProductId as string,
                relationType: r.relationType as ProductRelationType,
                sortOrder: r.sortOrder != null ? Number(r.sortOrder) : undefined,
                isRequired: !!r.isRequired,
            }));

            // dados básicos
            const productData = {
                id: req.body.id as string,
                name: req.body.name,
                metaTitle: req.body.metaTitle,
                metaDescription: req.body.metaDescription,
                keywords: safeParse(req.body.keywords),
                brand: req.body.brand,
                ean: req.body.ean,
                description: req.body.description,
                skuMaster: req.body.skuMaster,
                price_of: req.body.price_of ? Number(req.body.price_of) : undefined,
                price_per: req.body.price_per ? Number(req.body.price_per) : undefined,
                weight: req.body.weight ? Number(req.body.weight) : undefined,
                length: req.body.length ? Number(req.body.length) : undefined,
                width: req.body.width ? Number(req.body.width) : undefined,
                height: req.body.height ? Number(req.body.height) : undefined,
                stock: req.body.stock ? Number(req.body.stock) : undefined,
                status: req.body.status as StatusVariant,
                mainPromotion_id: req.body.mainPromotion_id || null,
                videoLinks: safeParse(req.body.videoLinks).filter((u: any) => typeof u === "string"),
                categories: safeParse(req.body.categories),
                descriptions: safeParse(req.body.descriptions),
                variants,
                relations,
            };

            const service = new ProductUpdateDataService();
            const updated = await service.execute(productData, files);
            res.json(updated);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Erro interno ao atualizar produto" });
        }
    }
}