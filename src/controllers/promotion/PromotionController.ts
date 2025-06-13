import { Request, Response } from 'express'
import { PromotionService, CreatePromotionDto } from '../../services/promotion/PromotionService'
import {
    ConditionType,
    Operator,
    ActionType,
    DisplayType
} from '@prisma/client'

export class PromotionController {
    private service = new PromotionService()

    public async create(req: Request, res: Response) {
        try {
            const b = req.body
            const files = req.files as Express.Multer.File[] | undefined

            // Badge titles
            let badgeTitles: string[] = []
            if (b.badgeTitles) {
                badgeTitles = Array.isArray(b.badgeTitles)
                    ? b.badgeTitles.map(String)
                    : [String(b.badgeTitles)]
            }

            // Monta array de BadgeInput
            const badges = files
                ? files.map((file, idx) => ({
                    title: badgeTitles[idx] || 'Sem título',
                    imageUrl: file.filename
                }))
                : undefined

            // Função util para desserializar JSON caso venha como string
            const parseJsonArray = <T>(field: any): T[] | undefined => {
                if (!field) return undefined
                if (Array.isArray(field)) return field
                try {
                    return JSON.parse(field)
                } catch {
                    return undefined
                }
            }

            const dto: CreatePromotionDto = {
                name: String(b.name),
                description: b.description ? String(b.description) : undefined,
                startDate: new Date(b.startDate),
                endDate: new Date(b.endDate),

                hasCoupon: Boolean(b.hasCoupon),
                multipleCoupons: Boolean(b.multipleCoupons),
                reuseSameCoupon: Boolean(b.reuseSameCoupon),
                perUserCouponLimit: b.perUserCouponLimit != null ? Number(b.perUserCouponLimit) : undefined,
                totalCouponCount: b.totalCouponCount != null ? Number(b.totalCouponCount) : undefined,
                coupons: Array.isArray(b.coupons) ? b.coupons.map(String) : [],

                active: Boolean(b.active),
                cumulative: Boolean(b.cumulative),
                priority: Number(b.priority),

                conditions: parseJsonArray<{ type: ConditionType; operator: Operator; value: any }>(b.conditions),
                actions: parseJsonArray<{ type: ActionType; params: any }>(b.actions),
                displays: parseJsonArray<{ title: string; type: DisplayType; content: string }>(b.displays),

                badges
            }

            const promo = await this.service.createFull(dto)
            res.status(201).json(promo)
        } catch (err: any) {
            console.error(err)
            res.status(400).json({ error: err.message })
        }
    }

    public async list(req: Request, res: Response) {
        try {
            const promos = await this.service.listAll()
            res.json(promos)
        } catch (err: any) {
            console.error(err)
            res.status(500).json({ error: 'Falha ao listar promoções.' })
        }
    }

    public async getById(req: Request, res: Response) {
        try {
            const { id } = req.params
            const promo = await this.service.getById(id)
            if (!promo) return res.status(404).json({ error: 'Promoção não encontrada.' })
            res.json(promo)
        } catch (err: any) {
            console.error(err)
            res.status(500).json({ error: 'Falha ao buscar promoção.' })
        }
    }

    public async delete(req: Request, res: Response) {
        try {
            const { id } = req.params
            await this.service.delete(id)
            res.status(204).send()
        } catch (err: any) {
            console.error(err)
            res.status(500).json({ error: 'Falha ao excluir promoção.' })
        }
    }
}