import { Request, Response } from 'express';
import { CreateReviewService } from '../../services/review/CreateReviewService';

class CreateReviewController {
    async handle(req: Request, res: Response) {
        try {
            // compatibilidade: aceitar { rating, comment, ... } OU { reviewData: { ... } }
            const payload = (req.body && req.body.reviewData) ? req.body.reviewData : req.body;

            const {
                rating,
                comment,
                product_id,
                customer_id,
                nameCustomer
            } = payload;

            if (!product_id || !customer_id || !nameCustomer) {
                res.status(400).json({ error: 'Campos obrigatórios ausentes: product_id, customer_id, nameCustomer' });
            }

            const service = new CreateReviewService();
            const created = await service.execute({
                rating,
                comment,
                product_id,
                customer_id,
                nameCustomer
            });

            res.status(201).json(created);
        } catch (err: any) {
            console.error('CreateReviewController error:', err);
            res.status(500).json({ error: 'Erro ao criar avaliação', details: err.message || err });
        }
    }
}

export { CreateReviewController }