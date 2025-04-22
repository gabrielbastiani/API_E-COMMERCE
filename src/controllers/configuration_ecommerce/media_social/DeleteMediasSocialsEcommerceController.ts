import { Request, Response } from 'express'
import { DeleteMediasSocialsEcommerceService } from '../../../services/configuration_ecommerce/media_social/DeleteMediasSocialsEcommerceService'; 

class DeleteMediasSocialsEcommerceController {
    async handle(req: Request, res: Response) {

        const socialMediasBlog_id = req.query.socialMediasBlog_id as string;

        const configs = new DeleteMediasSocialsEcommerceService();

        const ecommerce = await configs.execute({ socialMediasBlog_id });

        res.json(ecommerce);

    }
}

export { DeleteMediasSocialsEcommerceController }