import { Request, Response } from 'express'
import { MediasSocialsEcommerceService } from '../../../services/configuration_ecommerce/media_social/MediasSocialsEcommerceService'; 

class MediasSocialsEcommerceController {
    async handle(req: Request, res: Response) {

        const configs = new MediasSocialsEcommerceService();

        const ecommerce = await configs.execute();

        res.json(ecommerce);

    }
}

export { MediasSocialsEcommerceController }