import { Request, Response } from "express";
import { StatusProductService } from "../../services/product/StatusProductService"; 

class StatusProductController {
    async handle(req: Request, res: Response) {
        const { id, status } = req.body;

        const statusProduct = new StatusProductService();

        const product = await statusProduct.execute({id, status});

        res.json(product);
    }
}

export { StatusProductController }