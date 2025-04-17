import { Request, Response } from "express";
import { ExistingPublicationPageService } from "../../services/marketing_publication/ExistingPublicationPageService"; 

class ExistingPublicationPageController {
    async handle(req: Request, res: Response) {

        const local = req.query.local as string;
        const position = req.query.position as string;

        const createBannerService = new ExistingPublicationPageService();

        const marketing = await createBannerService.execute({ local, position });

        res.status(200).json(marketing);
    }
}

export { ExistingPublicationPageController };