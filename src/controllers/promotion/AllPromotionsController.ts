import { Request, Response } from "express";
import { AllPromotionsService } from "../../services/promotion/AllPromotionsService"; 
import { Prisma } from "@prisma/client";

class AllPromotionsController {
    async handle(req: Request, res: Response) {
        const {
            page = 1,
            limit = 5,
            search = "",
            orderBy = "created_at",
            orderDirection = "desc",
            startDate,
            endDate
        } = req.query;

        const allPromotions = new AllPromotionsService();
        const promotions = await allPromotions.execute(
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined
        );

        res.json(promotions);
    }
}

export { AllPromotionsController };