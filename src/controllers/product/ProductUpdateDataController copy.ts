import { Request, Response } from "express";
import { ProductUpdateDataService } from "../../services/product/productUpdateData/ProductUpdateDataService";
import { StatusProduct } from "@prisma/client";

export class ProductUpdateDataController {
    async handle(req: Request, res: Response): Promise<void> {
        try {
            // Espera receber um único campo “payload” contendo o JSON como string
            const rawPayload = req.body?.payload as string | undefined;
            if (!rawPayload) {
                res.status(400).json({ error: "Campo 'payload' ausente." });
                return;
            }

            let parsed: any;
            try {
                parsed = JSON.parse(rawPayload);
            } catch {
                res.status(400).json({ error: "Erro ao fazer parse de 'payload'." });
                return;
            }

            // ID do produto é obrigatório
            const idStr = parsed.id as string | undefined;
            if (!idStr || idStr.trim() === "") {
                res.status(400).json({ error: "O campo `id` do produto é obrigatório." });
                return;
            }

            const productData = {
                id: idStr,
                name: parsed.name as string | undefined,
                slug: parsed.slug as string | undefined,
                metaTitle: parsed.metaTitle as string | undefined,
                metaDescription: parsed.metaDescription as string | undefined,
                keywords: Array.isArray(parsed.keywords) ? parsed.keywords : undefined,
                brand: parsed.brand as string | undefined,
                ean: parsed.ean as string | undefined,
                description: parsed.description as string | undefined,
                skuMaster: parsed.skuMaster as string | undefined,
                price_of: parsed.price_of != null ? Number(parsed.price_of) : undefined,
                price_per: parsed.price_per != null ? Number(parsed.price_per) : undefined,
                weight: parsed.weight != null ? Number(parsed.weight) : undefined,
                length: parsed.length != null ? Number(parsed.length) : undefined,
                width: parsed.width != null ? Number(parsed.width) : undefined,
                height: parsed.height != null ? Number(parsed.height) : undefined,
                stock: parsed.stock != null ? Number(parsed.stock) : undefined,
                status: parsed.status as StatusProduct,
                mainPromotion_id:
                    parsed.mainPromotion_id != null ? String(parsed.mainPromotion_id) : null,
                buyTogether_id:
                    parsed.buyTogether_id != null ? String(parsed.buyTogether_id) : null,
                // Novos campos para principal do produto
                primaryMainImageId: parsed.primaryMainImageId as string | undefined,
                primaryMainImageName: parsed.primaryMainImageName as string | undefined,

                videoLinks: Array.isArray(parsed.videoLinks) ? parsed.videoLinks : undefined,
                categories: Array.isArray(parsed.categories) ? parsed.categories : undefined,
                existingImages: Array.isArray(parsed.existingImages) ? parsed.existingImages : undefined,
                descriptions: Array.isArray(parsed.descriptions) ? parsed.descriptions : undefined,
                variants: Array.isArray(parsed.variants) ? parsed.variants : undefined,
                relations: Array.isArray(parsed.relations) ? parsed.relations : undefined
            };

            let allFiles: Express.Multer.File[] = [];

            if (Array.isArray(req.files)) {
                allFiles = req.files as Express.Multer.File[];
            }
            else if (req.files && typeof req.files === "object") {
                for (const k of Object.keys(req.files)) {
                    const v = (req.files as any)[k];
                    if (Array.isArray(v)) {
                        allFiles.push(...v);
                    } else if (v) {
                        // safety: single file
                        allFiles.push(v as Express.Multer.File);
                    }
                }
            }

            const files = {
                images: [] as Express.Multer.File[],
                variantImages: {} as Record<string, Express.Multer.File[]>,
                attributeImages: {} as Record<string, Record<number, Express.Multer.File[]>>
            };

            for (const f of allFiles) {
                const sep = f.fieldname.includes("::") ? "::" : "_";
                const parts = f.fieldname.split(sep);

                const type = parts[0];

                if (type === "productImage") {
                    files.images.push(f);
                } else if (type === "variantImage" && parts[1]) {
                    const variantId = parts[1];
                    if (!files.variantImages[variantId]) files.variantImages[variantId] = [];
                    files.variantImages[variantId].push(f);
                } else if (type === "attributeImage" && parts[1] && typeof parts[2] !== "undefined") {
                    const variantId = parts[1];
                    const attrIdx = Number(parts[2]);
                    if (!files.attributeImages[variantId]) files.attributeImages[variantId] = {};
                    if (!files.attributeImages[variantId][attrIdx]) {
                        files.attributeImages[variantId][attrIdx] = [];
                    }
                    files.attributeImages[variantId][attrIdx].push(f);
                } else {

                }
            }

            const service = new ProductUpdateDataService();
            const updated = await service.execute(productData, files);
            res.json(updated);
            return;
        } catch (err) {
            console.error("❌ [ProductUpdateDataController] Error:", err);
            res.status(500).json({ error: "Erro interno ao atualizar produto" });
            return;
        }
    }
}