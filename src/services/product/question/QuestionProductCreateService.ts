import prismaClient from "../../../prisma";

interface QuestionProductProps {
    customer_id: string;
    product_id: string;
    question: string;
}

class QuestionProductCreateService {
    async execute({ customer_id, product_id, question }: QuestionProductProps) {
        const questionProduct = await prismaClient.questionProduct.create({
            data: {
                customer_id: customer_id,
                product_id: product_id,
                question: question
            }
        });

        return questionProduct;

    }
}

export { QuestionProductCreateService }