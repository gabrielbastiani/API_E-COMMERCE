import { Request, Response } from "express";
import { AllProductsService } from "../../services/product/AllProductsService"; 
import { Prisma } from "@prisma/client";

class AllProductsController {
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

        const allProducts = new AllProductsService();
        const products = await allProducts.execute(
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined
        );

        res.json(products);
    }
}

export { AllProductsController };