import { Request, Response } from 'express'
import { AllSeoEcommercePageService } from '../../../services/configuration_ecommerce/seo/AllSeoEcommercePageService'; 

class AllSeoEcommercePageController {
    async handle(req: Request, res: Response) {

        const seo = new AllSeoEcommercePageService();

        const ecommerce = await seo.execute();

        res.json(ecommerce);

    }
}

export { AllSeoEcommercePageController }