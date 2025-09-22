import { Request, Response } from 'express'
import { QuestionProductStatusApprovedService } from '../../../services/product/question/QuestionProductStatusApprovedService';

class QuestionProductStatusApprovedController {
    async handle(req: Request, res: Response) {

        const product_id = req.query.product_id as string;

        const dataProduct = new QuestionProductStatusApprovedService();

        const productDatas = await dataProduct.execute({ product_id });

        res.json(productDatas);

    }
}

export { QuestionProductStatusApprovedController }