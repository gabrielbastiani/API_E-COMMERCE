import { Request, Response } from "express";
import { ProductDeleteService } from "../../services/product/ProductDeleteService";

export class ProductDeleteController {
    async handle(req: Request, res: Response) {
        try {
            // (1) Extrai array de IDs do corpo da requisição
            // Suporta um body do tipo { ids: ["uuid1", "uuid2", ...] }
            let { id_delete, name } = req.body;

            if (!Array.isArray(id_delete)) {
                id_delete = [id_delete];
            }

            // (2) Chama o Service que tratará a exclusão em cascata
            const service = new ProductDeleteService();
            await service.execute( id_delete, name );

            res.status(200).json({ message: "Produto(s) excluído(s) com sucesso." });
        } catch (err) {
            console.error("❌ [ProductDeleteController] Error:", err);
            res.status(500).json({ error: "Erro interno ao deletar produto(s)." });
        }
    }
}