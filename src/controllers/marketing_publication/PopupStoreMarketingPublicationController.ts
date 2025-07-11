import { Request, Response } from "express";
import { PopupStoreMarketingPublicationService } from "../../services/marketing_publication/PopupStoreMarketingPublicationService"; 

class PopupStoreMarketingPublicationController {
    async handle(req: Request, res: Response) {

        const local = req.query.local as string;
        const position = req.query.position as string;

        const allPublication = new PopupStoreMarketingPublicationService();
        
        const publications = await allPublication.execute({ local, position });

        res.json(publications);
    }
}

export { PopupStoreMarketingPublicationController };