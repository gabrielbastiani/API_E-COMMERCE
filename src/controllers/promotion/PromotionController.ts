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
    update: any
    handleGetAll: any

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
                    const parsed = JSON.parse(field)
                    return Array.isArray(parsed) ? parsed : undefined
                } catch {
                    return undefined
                }
            }

            const parseBool = (v: any) => {
                if (typeof v === 'string') {
                    const l = v.toLowerCase().trim()
                    return l === 'true' || l === '1'
                }
                return Boolean(v)
            }

            const parseDate = (v: any): Date | undefined => {
                if (!v) return undefined;
                // v === "YYYY-MM-DDThh:mm" → Date interpretará como local
                const d = new Date(v);
                return isNaN(d.getTime()) ? undefined : d;
            };

            // --- Novo: parse robusto para o campo 'coupons' ---
            const parseStringArrayOrSingle = (field: any): string[] | undefined => {
                if (field == null) return undefined

                // Se já é array
                if (Array.isArray(field)) {
                    const arr = field.map(String).map(s => s.trim()).filter(Boolean)
                    return arr.length > 0 ? arr : undefined
                }

                // Se for string — pode ser JSON stringificado, CSV ou single value
                if (typeof field === 'string') {
                    const raw = field.trim()
                    if (raw === '') return undefined

                    // tenta JSON.parse (ex.: '["A","B"]')
                    if ((raw.startsWith('[') && raw.endsWith(']')) || raw.startsWith('"')) {
                        try {
                            const parsed = JSON.parse(raw)
                            if (Array.isArray(parsed)) {
                                const arr = parsed.map(String).map(s => s.trim()).filter(Boolean)
                                return arr.length > 0 ? arr : undefined
                            }
                        } catch {
                            // ignore parse error e seguir
                        }
                    }

                    // se conter vírgula, trata como CSV
                    if (raw.includes(',')) {
                        const arr = raw.split(',').map(s => s.trim()).filter(Boolean)
                        return arr.length > 0 ? arr : undefined
                    }

                    // caso simples: único código
                    return raw ? [raw] : undefined
                }

                // outros tipos (number etc.)
                try {
                    const coerced = String(field).trim()
                    return coerced ? [coerced] : undefined
                } catch {
                    return undefined
                }
            }

            const dto: CreatePromotionDto = {
                name: String(b.name),
                description: b.description ? String(b.description) : undefined,
                startDate: parseDate(b.startDate),
                endDate: parseDate(b.endDate),

                hasCoupon: parseBool(b.hasCoupon),
                multipleCoupons: parseBool(b.multipleCoupons),
                reuseSameCoupon: parseBool(b.reuseSameCoupon),
                perUserCouponLimit: b.perUserCouponLimit != null ? Number(b.perUserCouponLimit) : undefined,
                totalCouponCount: b.totalCouponCount != null ? Number(b.totalCouponCount) : undefined,
                // usa parser robusto (retorna undefined quando não houver cupons)
                coupons: parseStringArrayOrSingle(b.coupons),

                status: b.status || "Indisponivel",
                cumulative: parseBool(b.cumulative),
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