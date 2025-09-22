import { Request, Response } from "express";
import { QuestionProductCMSService } from "../../../services/product/question/QuestionProductCMSService";
import { Prisma } from "@prisma/client";

class QuestionProductCMSController {
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

        const allQuestions = new QuestionProductCMSService();
        const questions = await allQuestions.execute(
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined
        );

        res.json(questions);
    }
}

export { QuestionProductCMSController };