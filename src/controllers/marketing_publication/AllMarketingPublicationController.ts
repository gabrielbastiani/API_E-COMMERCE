import { Request, Response } from "express";
import { AllMarketingPublicationService } from "../../services/marketing_publication/AllMarketingPublicationService"; 
import { Prisma } from "@prisma/client";

class AllMarketingPublicationController {
    async handle(req: Request, res: Response) {
        const { 
            page = 1, 
            marketing_publication_id,
            limit = 5, 
            search = "", 
            orderBy = "created_at", 
            orderDirection = "desc",
            startDate,
            endDate
        } = req.query;

        const allPublication = new AllMarketingPublicationService();
        const publications = await allPublication.execute(
            marketing_publication_id ? String(marketing_publication_id) : undefined,
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined
        );

        res.json(publications);
    }
}

export { AllMarketingPublicationController };