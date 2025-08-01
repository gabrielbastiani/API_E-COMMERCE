import { Request, Response } from 'express'
import { UpdatePromotionService, UpdatePromotionDto } from '../../services/promotion/UpdatePromotionService'
import { ConditionInput } from '../../services/promotion/PromotionService'
import fs from 'fs'
import path from 'path'
import prisma from '../../prisma'

export class UpdatePromotionController {
    private svc = new UpdatePromotionService()

    public async update(req: Request, res: Response) {
        try {
            const id = req.params.promotion_id || req.params.id
            if (!id) throw new Error('ID da promoção não fornecido.')

            const b = req.body

            // 1) badgesMeta cru
            const badgesMetaRaw = req.body.badges
            const badgesMeta: { title: string; imageUrl: string }[] = Array.isArray(badgesMetaRaw)
                ? badgesMetaRaw
                : (badgesMetaRaw ? JSON.parse(badgesMetaRaw) : [])

            const badgeFiles = (req.files as any)?.badgeFiles as Express.Multer.File[] | undefined

            // 2) pega selos atuais do DB
            const existing = await prisma.promotionBadge.findMany({ where: { promotion_id: id } })
            const existingUrls = existing.map(b => b.imageUrl)

            // 3) monta finalBadges: usa badgeFiles para renomear, ou mantém o imageUrl
            const finalBadges: { title: string; imageUrl: string }[] = badgesMeta.map((m, idx) => {
                const file = badgeFiles?.[idx]
                if (file) {
                    const destName = `${Date.now()}_${file.originalname}`
                    const destPath = path.join(process.cwd(), 'images', destName)
                    fs.renameSync(file.path, destPath)
                    return { title: m.title, imageUrl: destName }
                }
                return m
            })

            // 4) determina quais arquivos apagar
            const keepSet = new Set(finalBadges.map(b => b.imageUrl))
            for (const oldUrl of existingUrls) {
                if (!keepSet.has(oldUrl)) {
                    const filePath = path.join(process.cwd(), 'images', oldUrl)
                    fs.existsSync(filePath) && fs.unlinkSync(filePath)
                }
            }

            // helpers
            const parseBool = (v: any): boolean | undefined => v === undefined ? undefined : v === 'true'
            const parseNumber = (v: any): number | undefined => v === undefined ? undefined : Number(v)
            const parseDate = (v: any): Date | undefined => v ? new Date(v) : undefined

            let coupons: { code: string }[] | undefined = undefined
            if (Object.prototype.hasOwnProperty.call(b, 'coupons')) {
                // se o formulário trouxe o campo `coupons` (mesmo vazio), a gente mapeia
                const raw = Array.isArray(b.coupons)
                    ? b.coupons
                    : typeof b.coupons === 'string'
                        ? [b.coupons]
                        : []
                coupons = raw.map((c: any) => ({ code: String(c) }))
            }

            // campos JSON para relacionamentos complexos (se tiver)
            const parseJsonArray = <T>(field: any): T[] | undefined => {
                if (!field) return undefined
                if (Array.isArray(field)) return field
                try { return JSON.parse(field) } catch { return undefined }
            }

            const rawStatus = String(b.status || '').trim()
            const validStatuses = ['Disponivel', 'Indisponivel', 'Programado'] as const

            const parseNullableNumber = (v: any): number | null | undefined => {
                if (v === undefined) return undefined
                if (v === '') return null
                const n = Number(v)
                return isNaN(n) ? undefined : n
            }

            const dto: UpdatePromotionDto = {
                name: b.name ? String(b.name) : undefined,
                description: b.description ? String(b.description) : undefined,
                startDate: parseDate(b.startDate),
                endDate: parseDate(b.endDate),

                hasCoupon: parseBool(b.hasCoupon),
                multipleCoupons: parseBool(b.multipleCoupons),
                reuseSameCoupon: parseBool(b.reuseSameCoupon),
                perUserCouponLimit: parseNullableNumber(b.perUserCouponLimit),
                totalCouponCount: parseNullableNumber(b.totalCouponCount),
                ...(coupons !== undefined && { coupons }),

                ...(validStatuses.includes(rawStatus as any) && { status: rawStatus as UpdatePromotionDto['status'] }),
                cumulative: parseBool(b.cumulative),
                priority: parseNumber(b.priority),

                // outros relacionamentos:
                conditions: parseJsonArray<ConditionInput>(b.conditions),
                actions: parseJsonArray(b.actions),
                displays: parseJsonArray(b.displays),
                badges: finalBadges
            }

            const updated = await this.svc.update(id, dto)
            res.json(updated)
        } catch (err: any) {
            console.error(err)
            res.status(400).json({ error: err.message })
        }
    }
}