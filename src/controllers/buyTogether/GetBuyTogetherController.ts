import { Request, Response } from "express";
import { GetBuyTogetherService } from "../../services/buyTogether/GetBuyTogetherService";
import { Prisma } from "@prisma/client";

export class GetBuyTogetherController {
    async handle(req: Request, res: Response) {
        try {
            const {
                page = "1",
                limit = "5",
                search = "",
                orderBy = "created_at",
                orderDirection = "desc",
                startDate,
                endDate,
            } = req.query;

            const service = new GetBuyTogetherService();
            const result = await service.execute({
                page: Number(page),
                limit: Number(limit),
                search: String(search),
                orderBy: String(orderBy),
                orderDirection: (orderDirection as Prisma.SortOrder) || "desc",
                startDate: startDate ? String(startDate) : undefined,
                endDate: endDate ? String(endDate) : undefined,
            });

            res.json(result);
        } catch (err) {
            console.error("❌ [GetBuyTogetherController]", err);
            res
                .status(500)
                .json({ error: "Erro interno ao listar grupos Compre Junto." });
        }
    }
}