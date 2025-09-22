import { Request, Response } from 'express';
import { QuestionProductDeleteService } from '../../../services/product/question/QuestionProductDeleteService';

class QuestionProductDeleteController {
    async handle(req: Request, res: Response) {
        const { id_delete } = req.body

        const questions = new QuestionProductDeleteService();

        const productQuestion = await questions.execute({
            id_delete
        });

        res.json(productQuestion)

    }
}

export { QuestionProductDeleteController }