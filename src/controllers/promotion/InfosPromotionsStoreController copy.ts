import { Request, Response } from "express";
import { InfosPromotionsStoreService } from "../../services/promotion/InfosPromotionsStoreService";

class InfosPromotionsStoreController {
    async handle(req: Request, res: Response) {
        try {
            const { product_id, variant_id, variant_sku, variant_ids } = req.query;

            const input: any = {};
            if (product_id && typeof product_id === "string") input.productId = product_id;
            if (variant_id && typeof variant_id === "string") input.variantId = variant_id;
            if (variant_sku && typeof variant_sku === "string") input.variantSku = variant_sku;
            if (variant_ids && typeof variant_ids === "string") {
                const arr = variant_ids.split(",").map(s => s.trim()).filter(Boolean);
                if (arr.length) input.variantIds = arr;
            }

            const service = new InfosPromotionsStoreService();
            const data = await service.execute(input);

            return res.json(data);
        } catch (err) {
            console.error("InfosPromotionsStoreController error:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
}

export { InfosPromotionsStoreController };