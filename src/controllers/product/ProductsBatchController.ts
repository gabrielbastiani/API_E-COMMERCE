import { Request, Response } from "express";
import { ProductsBatchService } from "../../services/product/ProductsBatchService";

class ProductsBatchController {
  async handle(req: Request, res: Response) {
    try {
      // suporta body { ids: [...] } ou query ids=1,2,3
      const idsFromQuery = typeof req.query.ids === "string" ? (req.query.ids as string).split(",").filter(Boolean) : [];
      const ids = Array.isArray(req.body?.ids) && req.body.ids.length ? req.body.ids : idsFromQuery;

      if (!ids || ids.length === 0) {
        res.status(400).json({ error: "ids são obrigatórios (body.ids ou query ?ids=...)" });
      }

      const service = new ProductsBatchService();
      const products = await service.execute({ ids });

      res.json(products);
    } catch (err) {
      console.error("ProductsBatchController error:", err);
      res.status(500).json({ error: "Erro interno ao buscar produtos" });
    }
  }
}

export { ProductsBatchController };