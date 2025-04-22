import { Request, Response } from 'express';
import { UpdateMediaSocialEcommerceService } from '../../../services/configuration_ecommerce/media_social/UpdateMediaSocialEcommerceService'; 

class UpdateMediaSocialEcommerceController {
    async handle(req: Request, res: Response) {

        const {
            socialMediasBlog_id,
            name_media,
            link
        } = req.body;

        const update_configs = new UpdateMediaSocialEcommerceService();

        let imageToUpdate = req.body.logo_media;
        if (req.file) {
            imageToUpdate = req.file.filename;
        }

        const configs = await update_configs.execute({
            socialMediasBlog_id,
            name_media,
            link,
            logo_media: imageToUpdate
        });

        res.json(configs);
    }
}

export { UpdateMediaSocialEcommerceController };