import { Request, Response } from 'express'
import { CmsGetProductService } from '../../services/product/CmsGetProductService'; 

class CmsGetProductController {
    async handle(req: Request, res: Response) {

        const product_id = req.query.product_id as string;

        const dataProduct = new CmsGetProductService();

        const productDatas = await dataProduct.execute({ product_id });

        res.json(productDatas);

    }
}

export { CmsGetProductController }