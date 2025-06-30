import { Request, Response } from "express";
import { UpdateBuyTogetherService } from "../../services/buyTogether/UpdateBuyTogetherService";

class UpdateBuyTogetherController {
    async handle(req: Request, res: Response) {
        const { id } = req.params;
        const { name, products } = req.body;
        const service = new UpdateBuyTogetherService();
        const updated = await service.execute({ id, name, products });
        res.json(updated);
    }
}

export { UpdateBuyTogetherController };