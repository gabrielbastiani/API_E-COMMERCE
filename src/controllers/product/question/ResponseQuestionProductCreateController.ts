import { Request, Response } from "express";
import { ResponseQuestionProductCreateService } from "../../../services/product/question/ResponseQuestionProductCreateService"; 

class ResponseQuestionProductCreateController {
    async handle(req: Request, res: Response) {

        const {
            userEcommerce_id,
            questionProduct_id,
            response
        } = req.body;

        const questionResponse = new ResponseQuestionProductCreateService();

        const quest = await questionResponse.execute({
            userEcommerce_id,
            questionProduct_id,
            response
        });

        res.json(quest);
    }
}

export { ResponseQuestionProductCreateController }