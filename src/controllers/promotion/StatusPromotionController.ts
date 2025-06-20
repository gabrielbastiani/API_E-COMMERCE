import { Request, Response } from "express";
import { StatusPromotionService } from "../../services/promotion/StatusPromotionService";  

class StatusPromotionController {
    async handle(req: Request, res: Response) {
        const { promotion_id, active } = req.body;

        const statusPromotion = new StatusPromotionService();

        const promotion = await statusPromotion.execute({promotion_id, active});

        res.json(promotion);
    }
}

export { StatusPromotionController }