// controllers/promotion/UpdatePromotionController.ts
import { Request, Response } from 'express'
import { UpdatePromotionService, UpdatePromotionDto } from '../../services/promotion/UpdatePromotionService'
import {
    ConditionType,
    Operator,
    ActionType,
    DisplayType
} from '@prisma/client'

export class UpdatePromotionController {
    private svc = new UpdatePromotionService()

    public async update(req: Request, res: Response) {
        try {
            const id = req.params.promotion_id || req.params.id
            if (!id) throw new Error('ID da promoção não fornecido.')

            // parse JSON arrays ou array de strings (coupons)
            const parseJsonArray = <T>(field: any): T[] | undefined => {
                if (!field) return undefined
                if (Array.isArray(field)) return field
                try { return JSON.parse(field) } catch { return undefined }
            }

            const b = req.body

            // Monta DTO:
            const dto: UpdatePromotionDto = {
                name: b.name ? String(b.name) : undefined,
                description: b.description ? String(b.description) : undefined,
                startDate: b.startDate ? new Date(b.startDate) : undefined,
                endDate: b.endDate ? new Date(b.endDate) : undefined,

                hasCoupon: b.hasCoupon !== undefined ? Boolean(b.hasCoupon) : undefined,
                multipleCoupons: b.multipleCoupons !== undefined ? Boolean(b.multipleCoupons) : undefined,
                reuseSameCoupon: b.reuseSameCoupon !== undefined ? Boolean(b.reuseSameCoupon) : undefined,
                perUserCouponLimit: b.perUserCouponLimit !== undefined ? Number(b.perUserCouponLimit) : undefined,
                totalCouponCount: b.totalCouponCount !== undefined ? Number(b.totalCouponCount) : undefined,

                // coupons: array de strings → map para objetos
                coupons: parseJsonArray<string>(b.coupons)?.map(code => ({ code })),

                active: b.active !== undefined ? Boolean(b.active) : undefined,
                cumulative: b.cumulative !== undefined ? Boolean(b.cumulative) : undefined,
                priority: b.priority !== undefined ? Number(b.priority) : undefined,

                // demais relacionamentos
                conditions: parseJsonArray<{ type: ConditionType, operator: Operator, value: any }>(b.conditions),
                actions: parseJsonArray<{ type: ActionType, params: any }>(b.actions),
                displays: parseJsonArray<{ title: string, type: DisplayType, content: string }>(b.displays),
                badges: parseJsonArray<{ title: string, imageUrl: string }>(b.badges)
            }

            const updated = await this.svc.update(id, dto)
            res.json(updated)
        } catch (err: any) {
            console.error(err)
            res.status(400).json({ error: err.message })
        }
    }
}