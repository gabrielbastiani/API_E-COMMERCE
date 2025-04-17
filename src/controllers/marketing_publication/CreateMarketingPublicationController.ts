import { Request, Response } from "express";
import { CreateMarketingPublicationService } from "../../services/marketing_publication/CreateMarketingPublicationService";

class CreateMarketingPublicationController {
    async handle(req: Request, res: Response) {
        const {
            title,
            description,
            redirect_url,
            publish_at_start,
            publish_at_end,
            status,
            position,
            conditions,
            text_button,
            text_publication,
            local,
            popup_time
        } = req.body;

        let imageToUpdate = req.body.image_url;
        if (!req.body.image_url && req.file) {
            imageToUpdate = req.file.filename;
        }

        const createBannerService = new CreateMarketingPublicationService();
        const popupTime = popup_time && !isNaN(Number(popup_time)) ? Number(popup_time) : undefined;

        const marketing = await createBannerService.execute({
            title,
            description,
            image_url: imageToUpdate,
            redirect_url,
            publish_at_start: publish_at_start ? new Date(publish_at_start) : undefined,
            publish_at_end: publish_at_end ? new Date(publish_at_end) : undefined,
            status: status || "Indisponivel",
            position,
            conditions,
            text_button,
            text_publication,
            local,
            popup_time: popupTime,
        });

        res.status(201).json(marketing);
    }
}

export { CreateMarketingPublicationController };