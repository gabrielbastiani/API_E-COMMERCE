import prismaClient from "../../prisma";
import { PromotionStatus, DiscountType } from '@prisma/client';

export interface CreatePromotionInput {
  code?: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  userUsageLimit?: number;
  minOrderAmount?: number;
  status?: PromotionStatus;
  stackable?: boolean;
}

export class PromotionService {
  /**
   * Creates a new promotion
   */
  async create(data: CreatePromotionInput) {
    return await prismaClient.promotion.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxDiscountAmount: data.maxDiscountAmount,
        startDate: data.startDate,
        endDate: data.endDate,
        usageLimit: data.usageLimit,
        userUsageLimit: data.userUsageLimit ?? 1,
        minOrderAmount: data.minOrderAmount,
        status: data.status || PromotionStatus.SCHEDULED,
        stackable: data.stackable ?? false,
      }
    });
  }

  /**
   * Fetches all promotions
   */
  async list() {
    return prismaClient.promotion.findMany({
      orderBy: { startDate: 'desc' }
    });
  }

  /**
   * Finds a promotion by ID
   */
  async getById(id: string) {
    return prismaClient.promotion.findUnique({ where: { id } });
  }

  /**
   * Updates an existing promotion
   */
  async update(id: string, data: Partial<CreatePromotionInput>) {
    return prismaClient.promotion.update({ where: { id }, data });
  }

  /**
   * Deletes a promotion
   */
  async delete(id: string) {
    return prismaClient.promotion.delete({ where: { id } });
  }
}