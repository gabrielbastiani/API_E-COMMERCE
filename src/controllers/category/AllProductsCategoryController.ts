import { Request, Response } from "express";
import { AllProductsCategoryService } from "../../services/category/AllProductsCategoryService";
import { Prisma } from "@prisma/client";

class AllProductsCategoryController {
    async handle(req: Request, res: Response) {
        const {
            category_id = "",
            page = "1",
            limit = "5",
            search = "",
            orderBy = "created_at",
            orderDirection = "desc",
            startDate,
            endDate,
        } = req.query;

        const service = new AllProductsCategoryService();
        const result = await service.execute(
            String(category_id),
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined
        );

        res.json(result);
    }
}

export { AllProductsCategoryController };