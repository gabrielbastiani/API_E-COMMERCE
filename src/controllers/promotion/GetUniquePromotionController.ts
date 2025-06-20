import { Request, Response } from "express";
import { GetUniquePromotionService } from "../../services/promotion/GetUniquePromotionService";

class GetUniquePromotionController {
    async handle(req: Request, res: Response) {
        const promotion_id = req.query.promotion_id as string;

        const promotion_get = new GetUniquePromotionService();

        const get = await promotion_get.execute({ promotion_id });

        res.json(get);
    }
}

export { GetUniquePromotionController }