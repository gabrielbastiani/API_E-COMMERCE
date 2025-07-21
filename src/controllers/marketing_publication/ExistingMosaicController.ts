import { Request, Response } from "express";
import { ExistingMosaicService } from "../../services/marketing_publication/ExistingMosaicService";

class ExistingMosaicController {
    async handle(req: Request, res: Response) {

        const local = req.query.local as string;

        const createBannerService = new ExistingMosaicService();

        const marketing = await createBannerService.execute({ local });

        res.status(200).json(marketing);
    }
}

export { ExistingMosaicController };