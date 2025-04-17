import { Request, Response } from "express";
import { ExistingIntervalBannerService } from "../../services/marketing_publication/ExistingIntervalBannerService";

class ExistingIntervalBannerController {
    async handle(req: Request, res: Response) {

        const createBannerService = new ExistingIntervalBannerService();

        const marketing = await createBannerService.execute();

        res.status(200).json(marketing);
    }
}

export { ExistingIntervalBannerController };