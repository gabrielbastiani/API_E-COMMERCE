import { Request, Response } from 'express'
import { ProductPageStoreDetailsService } from '../../services/product/ProductPageStoreDetailsService'; 

class ProductPageStoreDetailsController {
    async handle(req: Request, res: Response) {

        const productSlug = req.query.productSlug as string;

        const dataProduct = new ProductPageStoreDetailsService();

        const productDatas = await dataProduct.execute({ productSlug });

        res.json(productDatas);

    }
}

export { ProductPageStoreDetailsController }