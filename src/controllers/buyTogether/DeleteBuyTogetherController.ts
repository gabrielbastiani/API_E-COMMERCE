import { Request, Response } from "express";
import { DeleteBuyTogetherService } from "../../services/buyTogether/DeleteBuyTogetherService";

class DeleteBuyTogetherController {
    async handle(req: Request, res: Response) {

        const { id_delete } = req.body;

        if (!Array.isArray(id_delete) || id_delete.length === 0) {
            res
                .status(400)
                .json({ error: "É necessário informar um array de id_delete para deleção." });
        }

        const service = new DeleteBuyTogetherService();
        try {
            const { count } = await service.execute({ id_delete });
            res.json({ deletedCount: count });
        } catch (error) {
            console.error("❌ [DeleteBuyTogetherController] ", error);
            res
                .status(500)
                .json({ error: "Erro interno ao deletar grupo(s) Compre Junto." });
        }
    }
}

export { DeleteBuyTogetherController };