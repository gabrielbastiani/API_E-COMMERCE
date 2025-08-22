import { Request, Response } from "express";
import productsService from "../../services/favorite/products.service";

class ProductsController {
  /**
   * GET /api/products?ids=id1,id2,id3
   * Retorna array de produtos para os ids fornecidos (ordem não garantida).
   */
  async getProducts(req: Request, res: Response) {
    try {
      const idsRaw = req.query.ids as string | undefined;

      if (!idsRaw || idsRaw.trim() === "") {
        res.status(400).json({ message: "Query param 'ids' é obrigatório (ex: ?ids=id1,id2)" });
      }

      // split & sanitização básica
      /* @ts-ignore */
      const ids = idsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!ids.length) res.status(400).json({ message: "Nenhum id válido encontrado em 'ids'." });

      const products = await productsService.getProductsByIds(ids);

      res.status(200).json(products);
    } catch (err) {
      console.error("productsController.getProducts error:", err);
      res.status(500).json({ message: "Erro interno ao buscar produtos." });
    }
  }

  /**
   * GET /api/products/:id
   * Retorna um produto específico
   */
  async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) res.status(400).json({ message: "Parâmetro 'id' é obrigatório." });

      const product = await productsService.getProductById(id);
      if (!product) res.status(404).json({ message: "Produto não encontrado." });

      res.status(200).json(product);
    } catch (err) {
      console.error("productsController.getProductById error:", err);
      res.status(500).json({ message: "Erro interno ao buscar produto." });
    }
  }
}

export const productsController = new ProductsController();
export default productsController;