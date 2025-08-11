import { Request, Response } from "express";
import { LookupService } from "../../services/product/LookupService";

class LookupController {
    async handle(req: Request, res: Response) {
        try {
            const bodyProductIds = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
            const bodyVariantIds = Array.isArray(req.body?.variantIds) ? req.body.variantIds : [];

            const queryProductIds =
                typeof req.query.productIds === "string"
                    ? (req.query.productIds as string).split(",").filter(Boolean)
                    : [];
            const queryVariantIds =
                typeof req.query.variantIds === "string"
                    ? (req.query.variantIds as string).split(",").filter(Boolean)
                    : [];

            // Prioridade: body > query
            const productIds = bodyProductIds.length ? bodyProductIds : queryProductIds;
            const variantIds = bodyVariantIds.length ? bodyVariantIds : queryVariantIds;

            if ((!productIds || productIds.length === 0) && (!variantIds || variantIds.length === 0)) {
                res.status(400).json({
                    error:
                        "productIds ou variantIds são obrigatórios (envie no body ou em query string). Ex: { productIds: ['id1'], variantIds: ['vid1'] }",
                });
                return; // <-- importante: interrompe execução
            }

            const service = new LookupService();
            const result = await service.execute({ productIds, variantIds });

            res.json({
                products: result.products || [],
                variants: result.variants || [],
            });
        } catch (err: any) {
            // Log mais informativo
            console.error("LookupController error:", err?.message ?? err, err?.stack ?? "");
            // Se for erro do Prisma, podemos devolver status 503 com mensagem clara
            if (err?.code === "P1001") {
                res.status(503).json({ error: "Banco de dados indisponível (P1001). Verifique DATABASE_URL e servidor Postgres." });
            } else {
                res.status(500).json({ error: "Erro interno ao buscar catálogo" });
            }
        }
    }
}

export { LookupController };