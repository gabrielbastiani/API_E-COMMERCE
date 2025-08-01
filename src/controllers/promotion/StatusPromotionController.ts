import { Request, Response } from "express";
import { StatusPromotionService } from "../../services/promotion/StatusPromotionService";  

class StatusPromotionController {
    async handle(req: Request, res: Response) {
        const { promotion_id, status } = req.body;

        const statusPromotion = new StatusPromotionService();

        const promotion = await statusPromotion.execute({promotion_id, status});

        res.json(promotion);
    }
}

export { StatusPromotionController }