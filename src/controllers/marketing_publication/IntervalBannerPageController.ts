import { Request, Response } from "express";
import { IntervalBannerPageService } from "../../services/marketing_publication/IntervalBannerPageService";

class IntervalBannerPageController {
    async handle(req: Request, res: Response) {

        const local_site = req.query.local_site as string;

        const createBannerService = new IntervalBannerPageService();

        const marketing = await createBannerService.execute({ local_site });

        res.status(200).json(marketing);
    }
}

export { IntervalBannerPageController };