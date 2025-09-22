import moment from "moment";
import prismaClient from "../../../prisma";
import { Prisma, QuestionStatus } from "@prisma/client";

class QuestionProductCMSService {
    async execute(
        page: number = 1,
        limit: number = 5,
        search: string = "",
        orderBy: string = "created_at",
        orderDirection: Prisma.SortOrder = "desc",
        startDate?: string,
        endDate?: string
    ) {
        const skip = (page - 1) * limit;

        // Construção da cláusula 'where' com filtro de texto e data
        const whereClause: Prisma.QuestionProductWhereInput = {
            ...(
                search ? {
                    OR: [
                        { question: { contains: search, mode: Prisma.QueryMode.insensitive } }
                    ]
                } : {}
            ),
            ...(
                startDate && endDate ? {
                    created_at: {
                        gte: moment(startDate).startOf('day').toISOString(),
                        lte: moment(endDate).endOf('day').toISOString(),
                    }
                } : {}
            )
        };

        const all_questions = await prismaClient.questionProduct.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection },
            include: {
                customer: true,
                product: true,
                responseQuestionProduct: true
            }
        });

        const total_questions = await prismaClient.questionProduct.count({
            where: whereClause,
        });

        return {
            questions: all_questions,
            currentPage: page,
            totalPages: Math.ceil(total_questions / limit),
            totalQuestions: total_questions
        };
    }
}

export { QuestionProductCMSService };