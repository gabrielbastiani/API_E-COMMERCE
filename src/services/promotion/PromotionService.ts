import prisma from '../../prisma'
import {
  ConditionType,
  Operator,
  ActionType,
  DisplayType
} from '@prisma/client'

// === DTOs de entrada ===
export interface CouponInput {
  code: string
}

export interface ConditionInput {
  type: ConditionType
  operator: Operator
  value: any
}

export interface ActionInput {
  type: ActionType
  params: any
}

export interface DisplayInput {
  title: string
  type: DisplayType
  content: string
}

export interface BadgeInput {
  title: string
  imageUrl: string
}

export interface CreatePromotionDto {
  name: string
  description?: string
  startDate: Date
  endDate: Date

  hasCoupon: boolean
  multipleCoupons: boolean
  reuseSameCoupon: boolean
  perUserCouponLimit?: number
  totalCouponCount?: number
  coupons?: string[]

  active: boolean
  cumulative: boolean
  priority: number

  conditions?: ConditionInput[]
  actions?: ActionInput[]
  displays?: DisplayInput[]
  badges?: BadgeInput[]
}

export class PromotionService {
  static applyPromotions: any
  async createFull(data: CreatePromotionDto) {
    if (data.endDate <= data.startDate) {
      throw new Error('Data de término deve ser após início')
    }

    return prisma.promotion.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,

        hasCoupon: data.hasCoupon,
        multipleCoupons: data.multipleCoupons,
        reuseSameCoupon: data.reuseSameCoupon,
        perUserCouponLimit: data.perUserCouponLimit,
        totalCouponCount: data.totalCouponCount,

        coupons: data.coupons && data.coupons.length > 0
          ? { create: data.coupons.map<CouponInput>(code => ({ code })) }
          : undefined,

        active: data.active,
        cumulative: data.cumulative,
        priority: data.priority,

        conditions: data.conditions && data.conditions.length > 0
          ? {
            create: data.conditions.map<ConditionInput>(c => ({
              type: c.type,
              operator: c.operator,
              value: c.value
            }))
          }
          : undefined,

        actions: data.actions && data.actions.length > 0
          ? {
            create: data.actions.map<ActionInput>(a => ({
              type: a.type,
              params: a.params
            }))
          }
          : undefined,

        displays: data.displays && data.displays.length > 0
          ? {
            create: data.displays.map<DisplayInput>(d => ({
              title: d.title,
              type: d.type,
              content: d.content
            }))
          }
          : undefined,

        badges: data.badges && data.badges.length > 0
          ? {
            create: data.badges.map<BadgeInput>(b => ({
              title: b.title,
              imageUrl: b.imageUrl
            }))
          }
          : undefined
      }
    })
  }

  async listAll() {
    return prisma.promotion.findMany({
      include: {
        coupons: true,
        conditions: true,
        actions: true,
        displays: true,
        badges: true
      },
      orderBy: { priority: 'asc' }
    })
  }

  async getById(id: string) {
    return prisma.promotion.findUnique({
      where: { id },
      include: {
        coupons: true,
        conditions: true,
        actions: true,
        displays: true,
        badges: true
      }
    })
  }

  async delete(id: string) {
    return prisma.promotion.delete({ where: { id } })
  }
}