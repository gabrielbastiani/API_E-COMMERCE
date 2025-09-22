import prismaClient from "../../../prisma";

interface QuestionProps {
    id_delete: string[];
}

class QuestionProductDeleteService {
    async execute({ id_delete }: QuestionProps) {

        await prismaClient.questionProduct.deleteMany({
            where: {
                id: {
                    in: id_delete
                }
            }
        });

        const responseQuestion = await prismaClient.responseQuestionProduct.deleteMany({
            where: {
                questionProduct_id: {
                    in: id_delete
                }
            }
        });

        return responseQuestion;

    }
}

export { QuestionProductDeleteService }