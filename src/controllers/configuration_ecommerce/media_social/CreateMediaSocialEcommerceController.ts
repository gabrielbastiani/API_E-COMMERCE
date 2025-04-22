import { Request, Response } from 'express';
import { CreateMediaSocialEcommerceService } from '../../../services/configuration_ecommerce/media_social/CreateMediaSocialEcommerceService'; 

class CreateMediaSocialEcommerceController {
    async handle(req: Request, res: Response) {
        const {
            name_media, link, logo_media
        } = req.body;

        const create_configuration = new CreateMediaSocialEcommerceService();

        let imageToUpdate = logo_media;
        if (!logo_media && req.file) {
            imageToUpdate = req.file.filename;
        }

        const configuration = await create_configuration.execute({
            name_media,
            link,
            logo_media: imageToUpdate
        });

        res.json(configuration);
    }
}

export { CreateMediaSocialEcommerceController };