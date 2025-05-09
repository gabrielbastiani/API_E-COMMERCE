import { Request, Response } from 'express';
import { CreatePromotionInput, PromotionService } from '../../services/promotion/PromotionService';

export class PromotionController {
    private service = new PromotionService();

    public create = async (req: Request, res: Response) => {
        try {
            // Extrai as strings ISO do body
            const {
                code,
                name,
                description,
                discountType,
                discountValue,
                maxDiscountAmount,
                startDate,
                endDate,
                usageLimit,
                userUsageLimit,
                minOrderAmount,
                status,
                stackable
            } = req.body;

            // Converte para Date
            const dto: CreatePromotionInput = {
                code,
                name,
                description,
                discountType,
                discountValue,
                maxDiscountAmount,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                usageLimit,
                userUsageLimit,
                minOrderAmount,
                status,
                stackable
            };

            const promotion = await this.service.create(dto);
            res.status(201).json(promotion);
        } catch (err: any) {
            console.error(err);
            res.status(400).json({ error: err.message });
        }
    };

    public list = async (_req: Request, res: Response) => {
        try {
            const promotions = await this.service.list();
            res.json(promotions);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch promotions.' });
        }
    };

    public getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        try {
            const promotion = await this.service.getById(id);
            if (!promotion) {
                res.status(404).json({ error: 'Promotion not found.' });
            }
            res.json(promotion);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch promotion.' });
        }
    };

    public update = async (req: Request, res: Response) => {
        const { id } = req.params;
        try {
            const updated = await this.service.update(id, req.body);
            res.json(updated);
        } catch (err: any) {
            console.error(err);
            res.status(400).json({ error: err.message });
        }
    };

    public delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        try {
            await this.service.delete(id);
            res.status(204).send();
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete promotion.' });
        }
    };
}