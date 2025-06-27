import { Request, Response } from "express";
import { GetBuyTogetherService } from "../../services/buyTogether/GetBuyTogetherService"; 
import { Prisma } from "@prisma/client";

class GetBuyTogetherController {
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

        const allBuyTogether = new GetBuyTogetherService();
        const buyTogether = await allBuyTogether.execute(
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined
        );

        res.json(buyTogether);
    }
}

export { GetBuyTogetherController };