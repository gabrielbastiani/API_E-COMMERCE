import { Request, Response } from "express";
import { ProductsRecentlyViewsService } from "../../services/product/ProductsRecentlyViewsService";

export class ProductsRecentlyViewsController {
    async handle(req: Request, res: Response) {
        try {
            let { id } = req.body;
            if (!Array.isArray(id)) {
                id = [id];
            }

            const service = new ProductsRecentlyViewsService();
            const products = await service.execute({ id });  // passe um objeto com chave id

            // Retorne os produtos diretamente
            res.status(200).json(products);
        } catch (err) {
            console.error("❌ Erro ao capturar dados", err);
            res.status(500).json({ error: "Erro ao capturar dados" });
        }
    }
}