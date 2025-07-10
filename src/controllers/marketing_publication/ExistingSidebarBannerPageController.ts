import { Request, Response } from "express";
import { ExistingSidebarBannerPageService } from "../../services/marketing_publication/ExistingSidebarBannerPageService";

class ExistingSidebarBannerPageController {
    async handle(req: Request, res: Response) {

        const local = req.query.local as string;

        const createBannerService = new ExistingSidebarBannerPageService();

        const marketing = await createBannerService.execute({ local });

        res.status(200).json(marketing);
    }
}

export { ExistingSidebarBannerPageController };