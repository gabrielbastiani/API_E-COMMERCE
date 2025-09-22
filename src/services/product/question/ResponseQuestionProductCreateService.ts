import prismaClient from "../../../prisma";

interface ResponseQuestionProps {
    userEcommerce_id: string;
    questionProduct_id: string;
    response: string;
}

class ResponseQuestionProductCreateService {
    async execute({ userEcommerce_id, questionProduct_id, response }: ResponseQuestionProps) {
        const questionProduct = await prismaClient.responseQuestionProduct.create({
            data: {
                userEcommerce_id: userEcommerce_id,
                questionProduct_id: questionProduct_id,
                response: response
            }
        });

        return questionProduct;

    }
}

export { ResponseQuestionProductCreateService }