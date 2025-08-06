import { Request, Response } from 'express'
import { ProductsBuyToghethesService } from '../../services/product/ProductsBuyToghethesService'; 

class ProductsBuyToghethesController {
    async handle(req: Request, res: Response) {

        const product_id = req.query.product_id as string;

        const dataProduct = new ProductsBuyToghethesService();

        const productDatas = await dataProduct.execute({ product_id });

        res.json(productDatas);

    }
}

export { ProductsBuyToghethesController }