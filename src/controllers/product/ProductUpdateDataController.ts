import { Request, Response } from "express";
import { ProductUpdateDataService } from "../../services/product/ProductUpdateDataService";
import { ProductRelationType } from "@prisma/client";

export class ProductUpdateDataController {
    async handle(req: Request, res: Response) {
        try {
            // 1) Função de parse seguro de JSON
            const safeParse = (raw?: any): any[] => {
                if (raw == null) return [];
                if (typeof raw === "string") {
                    try { return JSON.parse(raw); } catch { return []; }
                }
                return Array.isArray(raw) ? raw : [];
            };

            // 2) Campos de texto
            const existingMainImageIds = safeParse(req.body.existingImages) as string[];
            const variantsData = safeParse(req.body.variants).map((v: any) => ({
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
            const relations = safeParse(req.body.relations).map(r => ({
                relationDirection: r.relationDirection as "child" | "parent",
                relatedProductId: r.relatedProductId,
                relationType: r.relationType as ProductRelationType,
                sortOrder: r.sortOrder,
                isRequired: !!r.isRequired,
            }));
            const videoLinks = safeParse(req.body.videoLinks).filter(u => typeof u === 'string');
            const descriptions = safeParse(req.body.descriptions);

            // 3) Agrupando os arquivos por fieldname
            const filesList = req.files as Express.Multer.File[];
            const files = {
                images: [] as Express.Multer.File[],
                variantImages: {} as Record<string, Express.Multer.File[]>,
                attributeImages: {} as Record<string, Record<number, Express.Multer.File[]>>
            };

            for (const f of filesList) {
                const parts = f.fieldname.split("_");
                if (parts[0] === "variantImages" && parts[1]) {
                    const vid = parts[1];
                    (files.variantImages[vid] ||= []).push(f);
                } else if (parts[0] === "attributeImages" && parts[1] && parts[2]) {
                    const vid = parts[1], ai = Number(parts[2]);
                    (files.attributeImages[vid] ||= {})[ai] ||= [];
                    files.attributeImages[vid][ai].push(f);
                } else if (f.fieldname === "images") {
                    files.images.push(f);
                }
            }

            // 4) Monta o objeto final
            const productData = {
                id: req.body.id as string,
                name: req.body.name,
                slug: req.body.slug,
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
                status: req.body.status,
                mainPromotion_id: req.body.mainPromotion_id || null,
                videoLinks,
                categories: safeParse(req.body.categories),
                existingImages: existingMainImageIds,
                descriptions,
                variants: variantsData,
                relations
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