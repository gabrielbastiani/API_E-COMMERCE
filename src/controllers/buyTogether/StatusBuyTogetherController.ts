import { Request, Response } from "express";
import { StatusBuyTogetherService } from "../../services/buyTogether/StatusBuyTogetherService"; 

class StatusBuyTogetherController {
    async handle(req: Request, res: Response) {
        
        const { id, status } = req.body;

        const statusBuy = new StatusBuyTogetherService();

        const buy = await statusBuy.execute({id, status});

        res.json(buy);
    }
}

export { StatusBuyTogetherController }