import { Request, Response } from 'express'
import { OffersProductService } from '../../services/product/OffersProductService'; 

class OffersProductController {
    async handle(req: Request, res: Response) {

        const dataProduct = new OffersProductService();

        const productDatas = await dataProduct.execute();

        res.json(productDatas);

    }
}

export { OffersProductController }