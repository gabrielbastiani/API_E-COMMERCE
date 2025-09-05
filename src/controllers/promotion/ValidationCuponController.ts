import { Request, Response } from "express";
import { ValidationCouponService } from "../../services/promotion/ValidationCuponService";
import prisma from "../../prisma";
import { StatusPromotion } from "@prisma/client";

export class ValidationCouponController {
  static async handle(req: Request, res: Response) {
    try {
      const {
        cartItems,
        customer_id,
        cep,
        shippingCost,
        coupon,
      } = req.body;

      if (!coupon || typeof coupon !== "string") {
        res.json({ valid: false });
      }

      const normalized = coupon.trim();

      // FETCH CUPOM (case-insensitive quando suportado)
      const couponRow = await prisma.coupon.findFirst({
        where: {
          code: { equals: normalized, mode: "insensitive" as any }, // "mode" works on Postgres; se seu DB não suportar, remova o mode
        },
        include: { promotion: true },
      });

      if (!couponRow || !couponRow.promotion) {
        // cupom não existe
        res.json({ valid: false });
        return
      }

      // Verifica status da promoção
      const promo = couponRow.promotion;
      if (promo.status !== StatusPromotion.Disponivel) {
        res.json({ valid: false });
      }

      // Verifica datas (se configuradas)
      const now = new Date();
      if (promo.startDate && new Date(promo.startDate) > now) {
        res.json({ valid: false });
      }
      if (promo.endDate && new Date(promo.endDate) < now) {
        res.json({ valid: false });
      }

      // 🔍 Descobre se é a primeira compra
      let isFirstPurchase = true;
      if (customer_id) {
        const count = await prisma.order.count({
          where: { customer_id }
        });
        isFirstPurchase = count === 0;
      }

      const svc = new ValidationCouponService();
      const { valid, result } = await svc.execute({
        cartItems,
        customer_id,
        isFirstPurchase,
        cep,
        shippingCost,
        coupon: normalized,
      });

      res.json({
        valid,
        promotions: result?.promotions,
        discountTotal: result?.discountTotal,
        freeGifts: result?.freeGifts,
      });
    } catch (err) {
      console.error("Erro em ValidationCouponController:", err);
      res
        .status(500)
        .json({ valid: false, error: "Erro ao validar cupom" });
    }
  }
}