import { Request, Response } from "express";
import { ProductUpdateDataService } from "../../services/product/ProductUpdateDataService";
import { ProductRelationType } from "@prisma/client";

export class ProductUpdateDataController {
    async handle(req: Request, res: Response) {
        try {
            const files = req.files as {
                images?: Express.Multer.File[];
                variantImages?: Express.Multer.File[];
                attributeImages?: Express.Multer.File[];
            };

            const safeParse = (raw?: any): any[] => {
                if (raw == null) return [];
                if (typeof raw === "string") {
                    try { return JSON.parse(raw); }
                    catch { return []; }
                }
                return Array.isArray(raw) ? raw : [];
            };

            // Ids de imagens principais que o usuário quer manter
            const existingMainImageIds = safeParse(req.body.existingImages) as string[];

            // Monta variantes
            const variants = safeParse(req.body.variants).map((v: any) => ({
                id: v.id,
                sku: v.sku,
                price_of: v.price_of,
                price_per: v.price_per,
                stock: v.stock,
                allowBackorders: v.allowBackorders,
                sortOrder: v.sortOrder,
                ean: v.ean,
                mainPromotion_id: v.mainPromotion_id,
                videoLinks: safeParse(v.videoLinks).filter((u: any) => typeof u === "string"),
                existingImages: safeParse(v.existingImages),
                attributes: safeParse(v.attributes).map((a: any) => ({
                    id: a.id,
                    key: a.key,
                    value: a.value,
                    status: a.status,
                    existingImages: safeParse(a.existingImages),
                })),
            }));

            // Relações
            const relations = (safeParse(req.body.relations) as any[]).map((r) => ({
                relationDirection: r.relationDirection as "child" | "parent",
                relatedProductId: r.relatedProductId as string,
                relationType: r.relationType as ProductRelationType,
                sortOrder: r.sortOrder != null ? Number(r.sortOrder) : undefined,
                isRequired: !!r.isRequired,
            }));

            const descriptions = safeParse(req.body.descriptions) as any[];

            const videoLinks = safeParse(req.body.videoLinks).filter(u => typeof u === 'string')

            // Dados básicos + listas de manter imagens
            const productData = {
                id: req.body.id as string,
                name: req.body.name,
                slug: req.body.slug,
                metaTitle: req.body.metaTitle,
                metaDescription: req.body.metaDescription,
                keywords: safeParse(req.body.keywords),
                brand: req.body.brand,
                ean: req.body.ean,
                descriptions: descriptions,
                skuMaster: req.body.skuMaster,
                price_of: req.body.price_of ? Number(req.body.price_of) : undefined,
                price_per: req.body.price_per ? Number(req.body.price_per) : undefined,
                weight: req.body.weight ? Number(req.body.weight) : undefined,
                length: req.body.length ? Number(req.body.length) : undefined,
                width: req.body.width ? Number(req.body.width) : undefined,
                height: req.body.height ? Number(req.body.height) : undefined,
                stock: req.body.stock ? Number(req.body.stock) : undefined,
                status: req.body.status,
                mainPromotion_id: req.body.mainPromotion_id || null,
                videoLinks: videoLinks,
                categories: safeParse(req.body.categories),
                existingImages: existingMainImageIds,
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