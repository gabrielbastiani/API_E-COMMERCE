import { Request, Response } from "express";
import { ListBuyTogetherService } from "../../services/buyTogether/ListBuyTogetherService";

class ListBuyTogetherController {
    async handle(_: Request, res: Response) {
        const service = new ListBuyTogetherService();
        const list = await service.execute();
        res.json(list);
    }
}

export { ListBuyTogetherController };