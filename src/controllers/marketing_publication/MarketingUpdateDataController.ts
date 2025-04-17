import { Request, Response } from 'express';
import { MarketingUpdateDataService } from '../../services/marketing_publication/MarketingUpdateDataService';

class MarketingUpdateDataController {
    async handle(req: Request, res: Response) {

        const {
            marketingPublication_id,
            title,
            description,
            status,
            redirect_url,
            text_button,
            publish_at_start,
            publish_at_end,
            position,
            conditions,
            popup_time,
            text_publication,
            local
        } = req.body;

        const update_publication = new MarketingUpdateDataService();

        let imageToUpdate = req.body.image_url;
        if (req.file) {
            imageToUpdate = req.file.filename;
        }

        const publications = await update_publication.execute({
            marketingPublication_id,
            title,
            description,
            image_url: imageToUpdate,
            status,
            text_button,
            redirect_url,
            publish_at_start: publish_at_start ? new Date(publish_at_start) : undefined,
            publish_at_end: publish_at_end ? new Date(publish_at_end) : undefined,
            position,
            conditions,
            popup_time,
            text_publication,
            local
        });

        res.json(publications);
    }
}

export { MarketingUpdateDataController };