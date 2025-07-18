import { Request, Response } from 'express'
import { HighlightsProductsService } from '../../services/product/HighlightsProductsService'; 

class HighlightsProductsController {
    async handle(req: Request, res: Response) {

        const dataProduct = new HighlightsProductsService();

        const productDatas = await dataProduct.execute();

        res.json(productDatas);

    }
}

export { HighlightsProductsController }