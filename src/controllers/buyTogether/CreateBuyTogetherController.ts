import { Request, Response } from "express";
import { CreateBuyTogetherService } from "../../services/buyTogether/CreateBuyTogetherService";

class CreateBuyTogetherController {
    async handle(req: Request, res: Response) {
        const { name, products } = req.body;
        const service = new CreateBuyTogetherService();
        const group = await service.execute({ name, products });
        res.status(201).json(group);
    }
}

export { CreateBuyTogetherController };