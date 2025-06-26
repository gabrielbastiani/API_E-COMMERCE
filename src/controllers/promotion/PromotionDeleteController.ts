import { Request, Response } from "express";
import { PromotionDeleteService } from "../../services/promotion/PromotionDeleteService";

export class PromotionDeleteController {
    async handle(req: Request, res: Response) {
        try {
            let { id_delete } = req.body;

            // aceita tanto string única quanto array
            if (!Array.isArray(id_delete)) {
                id_delete = [id_delete];
            }

            const service = new PromotionDeleteService();
            await service.execute(id_delete);

            res
                .status(200)
                .json({ message: "Promoção(ões) excluída(s) com sucesso." });
        } catch (err) {
            console.error("❌ [PromotionDeleteController] Error:", err);
            res
                .status(500)
                .json({ error: "Erro interno ao deletar promoção(ões)." });
        }
    }
}