import { Request, Response } from 'express'
import { QuestionProductStatusApprovedService } from '../../../services/product/question/QuestionProductStatusApprovedService';

class QuestionProductStatusApprovedController {
    async handle(req: Request, res: Response) {
        try {
            const product_id = req.query.product_id as string;
            if (!product_id) {
                res.status(400).json({ error: "product_id is required" });
            }

            const page = req.query.page ? Number(req.query.page) : undefined;
            const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
            const q = req.query.q ? String(req.query.q) : undefined;
            const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : undefined;
            const dateTo = req.query.dateTo ? String(req.query.dateTo) : undefined;

            const svc = new QuestionProductStatusApprovedService();
            const result = await svc.execute({ product_id, page, pageSize, q, dateFrom, dateTo });

            res.json(result);
        } catch (err) {
            console.error("Erro QuestionProductStatusApprovedController:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

export { QuestionProductStatusApprovedController }