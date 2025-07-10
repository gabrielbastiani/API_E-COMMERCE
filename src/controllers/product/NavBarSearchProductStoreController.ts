import { Request, Response } from "express";
import { NavBarSearchProductStoreService } from "../../services/product/NavBarSearchProductStoreService"; 

class NavBarSearchProductStoreController {
    async handle(req: Request, res: Response) {
        const {
            search = ""
        } = req.query;

        const allProduct = new NavBarSearchProductStoreService();
        const products = await allProduct.execute(
            String(search)
        );

        res.json(products);
    }
}

export { NavBarSearchProductStoreController };