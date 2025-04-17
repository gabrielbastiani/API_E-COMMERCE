import { Request, Response } from "express";
import { IntervalBannerService } from "../../services/marketing_publication/IntervalBannerService";

class IntervalBannerController {
    async handle(req: Request, res: Response) {
        const {
            local_site,
            interval_banner,
            label_local_site,
            label_interval_banner
        } = req.body;

        const createBannerService = new IntervalBannerService();

        const interval = interval_banner && !isNaN(Number(interval_banner)) ? Number(interval_banner) : undefined;

        const marketing = await createBannerService.execute({
            local_site,/* @ts-ignore */
            interval_banner: interval,
            label_interval_banner,
            label_local_site
        });

        res.status(200).json(marketing);
    }
}

export { IntervalBannerController };