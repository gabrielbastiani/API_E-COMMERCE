import { Request, Response, Router } from "express";
import { ValidationCouponService } from "../../services/promotion/ValidationCuponService"; 
import { ApplyPromotionController } from "./ApplyPromotionController";

export class ValidationCouponController {
  static async handle(req: Request, res: Response) {
    try {
      const {
        cartItems,
        customer_id,
        isFirstPurchase,
        cep,
        shippingCost,
        coupon,
      } = req.body;

      const svc = new ValidationCouponService();
      const { valid, result } = await svc.execute({
        cartItems,
        customer_id,
        isFirstPurchase,
        cep,
        shippingCost,
        coupon,
      });

      res.json({
        valid,
        promotions: result?.promotions,
        discountTotal: result?.discountTotal,
      });
    } catch (err) {
      console.error("Erro em ValidationCouponController:", err);
      res
        .status(500)
        .json({ valid: false, error: "Erro ao validar cupom" });
    }
  }
}

// monta e exporta o router corretamente
export const PromotionRoutes = Router();

PromotionRoutes.post(
  "/promotions/apply",
  ApplyPromotionController.apply
);
PromotionRoutes.post(
  "/coupon/validate",
  ValidationCouponController.handle
);