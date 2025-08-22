import { Request, Response } from 'express'
import { GetSeoEcommercePageService } from '../../../services/configuration_ecommerce/seo/GetSeoEcommercePageService'; 

class GetSeoEcommercePageController {
    async handle(req: Request, res: Response) {

        const page = req.query.page as string;

        const seo = new GetSeoEcommercePageService();

        const exommerce = await seo.execute({ page });

        res.json(exommerce);

    }
}

export { GetSeoEcommercePageController }