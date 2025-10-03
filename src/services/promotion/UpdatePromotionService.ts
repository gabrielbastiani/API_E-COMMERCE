import prisma from '../../prisma'
import {
    ConditionType,
    Operator,
    ActionType,
    DisplayType
} from '@prisma/client'

export interface CouponUpdateInput {
    code: string
}
export interface ConditionUpdateInput {
    type: ConditionType
    operator: Operator
    value: any
}
export interface ActionUpdateInput {
    type: ActionType
    params: any
}
export interface DisplayUpdateInput {
    title: string
    type: DisplayType
    content: string
}
export interface BadgeUpdateInput {
    title: string
    imageUrl: string
}

export interface UpdatePromotionDto {
    name?: string
    description?: string
    startDate?: Date
    endDate?: Date

    hasCoupon?: boolean
    multipleCoupons?: boolean
    reuseSameCoupon?: boolean
    perUserCouponLimit?: number | null
    totalCouponCount?: number | null
    coupons?: CouponUpdateInput[]

    status?: "Disponivel" | "Indisponivel" | "Programado";
    cumulative?: boolean
    priority?: number

    conditions?: ConditionUpdateInput[]
    actions?: ActionUpdateInput[]
    displays?: DisplayUpdateInput[]
    badges?: BadgeUpdateInput[]
}

export class UpdatePromotionService {
    async update(id: string, data: UpdatePromotionDto) {
        // 1) Fetch and validate
        const existing = await prisma.promotion.findUnique({ where: { id } })
        if (!existing) throw new Error('Promoção não encontrada.')
        if (data.startDate && data.endDate && data.endDate <= data.startDate) {
            throw new Error('Data de término deve ser após a de início.')
        }

        // --- VALIDAÇÕES RELACIONADAS A CUPONS (ANTES DA TRANSAÇÃO) ---
        // Somente quando o cliente explicitamente quer hasCoupon = true (fornecido no DTO)
        if (data.hasCoupon === true) {
            // Determina quantos cupons serão considerados após a operação:
            // - se data.coupons veio, considere esse array
            // - senão, verifique cupons existentes no BD
            const providedCouponsCount = Array.isArray(data.coupons) ? data.coupons.length : undefined

            // busca cupons existentes só se necessário
            const existingCoupons = await prisma.coupon.findMany({ where: { promotion_id: id } })
            const existingCount = existingCoupons.length

            const totalAfter = providedCouponsCount !== undefined ? providedCouponsCount : existingCount

            if (!totalAfter || totalAfter <= 0) {
                throw new Error('Quando "hasCoupon" for true, é obrigatório haver pelo menos 1 código de cupom (envie via `coupons` ou mantenha/adicione no banco).')
            }

            // determina o valor final de multipleCoupons (prioriza o valor vindo no DTO, senão o existente)
            const finalMultiple = data.multipleCoupons !== undefined ? data.multipleCoupons : existing.multipleCoupons

            if (!finalMultiple && totalAfter > 1) {
                throw new Error('A promoção está configurada para **não permitir múltiplos cupons**. Se desejar mais de 1 cupom, ative `multipleCoupons`.')
            }
        }

        // 2) Transactional update
        return prisma.$transaction(async tx => {
            // 2.0) Lógica extra: se veio status, ajusta flags
            const preFlat: any = {}
            if (data.status !== undefined) {
                // se programado, marca como não completada e sem e-mail enviado
                if (data.status === 'Programado') {
                    preFlat.is_completed = false
                    preFlat.email_sent = false
                }
                // sempre atualiza o status
                preFlat.status = data.status
            }

            // 2.1) Campos simples
            const flat: any = { ...preFlat }
            for (const key of [
                'name', 'description', 'startDate', 'endDate',
                'hasCoupon', 'multipleCoupons', 'reuseSameCoupon',
                'perUserCouponLimit', 'totalCouponCount',
                // status já tratado em preFlat, então podemos pular aqui
                'cumulative', 'priority'
            ] as const) {
                if ((data as any)[key] !== undefined) {
                    flat[key] = (data as any)[key]
                }
            }

            if (!flat.hasCoupon) {
                await tx.coupon.deleteMany({
                    where: { promotion_id: id }
                })
            }

            // 2.2) Executa o update
            await tx.promotion.update({
                where: { id },
                data: flat
            })

            // 2.2) Relacionamentos: se vierem no DTO, reseta e recria
            if (data.coupons) {
                await tx.coupon.deleteMany({ where: { promotion_id: id } })
                for (const c of data.coupons) {
                    await tx.coupon.create({ data: { code: c.code, promotion_id: id } })
                }
            }

            if (data.conditions) {
                await tx.promotionCondition.deleteMany({ where: { promotion_id: id } })
                for (const c of data.conditions) {
                    await tx.promotionCondition.create({
                        data: {
                            type: c.type,
                            operator: c.operator,
                            value: c.value,
                            promotion_id: id
                        }
                    })
                }
            }
            if (data.actions) {
                await tx.promotionAction.deleteMany({ where: { promotion_id: id } })
                for (const a of data.actions) {
                    await tx.promotionAction.create({
                        data: {
                            type: a.type,
                            params: a.params,
                            promotion_id: id
                        }
                    })
                }
            }
            if (data.displays) {
                await tx.promotionDisplay.deleteMany({ where: { promotion_id: id } })
                for (const d of data.displays) {
                    await tx.promotionDisplay.create({
                        data: {
                            title: d.title,
                            type: d.type,
                            content: d.content,
                            promotion_id: id
                        }
                    })
                }
            }
            if (data.badges) {
                await tx.promotionBadge.deleteMany({ where: { promotion_id: id } })
                for (const b of data.badges) {
                    await tx.promotionBadge.create({
                        data: {
                            title: b.title,
                            imageUrl: b.imageUrl,
                            promotion_id: id
                        }
                    })
                }
            }

            // 2.3) Retorna objeto completo
            return tx.promotion.findUnique({
                where: { id },
                include: {
                    coupons: true,
                    conditions: true,
                    actions: true,
                    displays: true,
                    badges: true
                }
            })
        })
    }
}