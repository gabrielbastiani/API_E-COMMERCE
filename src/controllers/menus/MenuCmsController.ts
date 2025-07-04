import { Request, Response } from "express";
import { MenuCmsService } from "../../services/menus/MenuCmsService"; 
import { Prisma } from "@prisma/client";

class MenuCmsController {
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

        const allMenus = new MenuCmsService();
        const menus = await allMenus.execute(
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined
        );

        res.json(menus);
    }
}

export { MenuCmsController };