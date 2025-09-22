import { QuestionStatus } from "@prisma/client";
import prismaClient from "../../../prisma";

interface QuestionProductProps {
    questionProduct_id: string;
    status: string;
}

class QuestionProductUpdateService {
    async execute({ questionProduct_id, status }: QuestionProductProps) {
        const questionProduct = await prismaClient.questionProduct.update({
            where: {
                id: questionProduct_id
            },
            data: {
                status: status as QuestionStatus
            }
        });

        return questionProduct;

    }
}

export { QuestionProductUpdateService }