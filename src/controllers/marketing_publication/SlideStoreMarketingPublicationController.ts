import { Request, Response } from "express";
import { SlideStoreMarketingPublicationService } from "../../services/marketing_publication/SlideStoreMarketingPublicationService"; 

class SlideStoreMarketingPublicationController {
    async handle(req: Request, res: Response) {

        const local = req.query.local as string;
        const position = req.query.position as string;

        const allPublication = new SlideStoreMarketingPublicationService();
        
        const publications = await allPublication.execute({ local, position });

        res.json(publications);
    }
}

export { SlideStoreMarketingPublicationController };