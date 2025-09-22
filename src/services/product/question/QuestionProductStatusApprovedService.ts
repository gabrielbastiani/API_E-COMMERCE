import prismaClient from "../../../prisma";

interface QuestionProductProps {
    product_id: string;
}

class QuestionProductStatusApprovedService {
    async execute({ product_id }: QuestionProductProps) {
        const questionProduct = await prismaClient.questionProduct.findMany({
            where: {
                product_id: product_id,
                status: "APPROVED"
            }
        });

        return questionProduct;

    }
}

export { QuestionProductStatusApprovedService }