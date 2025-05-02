import { Request, Response } from "express";
import { TemplatesEmailsService } from "../../services/templates_emails/TemplatesEmailsService"; 
import { Prisma } from "@prisma/client";

class TemplatesEmailsController {
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

        const allTemplates = new TemplatesEmailsService();
        const templates = await allTemplates.execute(
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined
        );

        res.json(templates);
    }
}

export { TemplatesEmailsController };