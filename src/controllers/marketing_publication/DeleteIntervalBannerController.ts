import { Request, Response } from "express";
import { DeleteIntervalBannerService } from "../../services/marketing_publication/DeleteIntervalBannerService";

class DeleteIntervalBannerController {
    async handle(req: Request, res: Response) {

        const bannerInterval_id = req.query.bannerInterval_id as string;

        const createBannerService = new DeleteIntervalBannerService();

        const marketing = await createBannerService.execute({ bannerInterval_id });

        res.status(200).json(marketing);
    }
}

export { DeleteIntervalBannerController };