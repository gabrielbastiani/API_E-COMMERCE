import { Request, Response } from "express";
import { QuestionProductUpdateService } from "../../../services/product/question/QuestionProductUpdateService";

class QuestionProductUpdateController {
    async handle(req: Request, res: Response) {

        const questionProduct_id = req.query.questionProduct_id as string;

        const { status } = req.body;

        const questionResponse = new QuestionProductUpdateService();

        const quest = await questionResponse.execute({
            questionProduct_id,
            status
        });

        res.json(quest);
    }
}

export { QuestionProductUpdateController }