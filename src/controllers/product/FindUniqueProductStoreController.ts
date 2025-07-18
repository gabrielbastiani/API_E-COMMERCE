import { Request, Response } from "express";
import { FindUniqueProductStoreService } from "../../services/product/FindUniqueProductStoreService";

class FindUniqueProductStoreController {
    async handle(req: Request, res: Response) {

        const product_id = req.query.product_id as string;

        const productData = new FindUniqueProductStoreService();

        const product = await productData.execute({ product_id });

        res.json(product);
    }
}

export { FindUniqueProductStoreController }