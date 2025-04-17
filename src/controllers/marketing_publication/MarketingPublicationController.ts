import { Request, Response } from "express";
import { MarketingPublicationService } from "../../services/marketing_publication/MarketingPublicationService";

class MarketingPublicationController {
    async handle(req: Request, res: Response) {

        const local = req.query.local as string;
        const position = req.query.position as string;

        const allPublication = new MarketingPublicationService();

        const publications = await allPublication.execute({ local, position });

        res.json(publications);
    }
}

export { MarketingPublicationController };