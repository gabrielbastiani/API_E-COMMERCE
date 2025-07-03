import { Request, Response } from "express";
import { FilterCmsService } from "../../services/filter/FilterCmsService"; 
import { Prisma } from "@prisma/client";

class FilterCmsController {
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

        const allFilters = new FilterCmsService();
        const filters = await allFilters.execute(
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined
        );

        res.json(filters);
    }
}

export { FilterCmsController };