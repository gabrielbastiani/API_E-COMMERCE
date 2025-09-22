import { Request, Response } from "express";
import { QuestionProductCreateService } from "../../../services/product/question/QuestionProductCreateService";

class QuestionProductCreateController {
    async handle(req: Request, res: Response) {

        const {
            customer_id,
            product_id,
            question
        } = req.body;

        const questionResponse = new QuestionProductCreateService();

        const quest = await questionResponse.execute({
            customer_id,
            product_id,
            question
        });

        res.json(quest);
    }
}

export { QuestionProductCreateController }