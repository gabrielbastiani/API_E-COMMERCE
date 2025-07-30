import { Request, Response, Router } from "express";
import { ApplyPromotionsInput, PromotionService } from "../../services/promotion/ApplyPromotionService";

export class ApplyPromotionController {
  static async apply(req: Request, res: Response) {
    try {
      const body = req.body as ApplyPromotionsInput;
      const result = await PromotionService.applyPromotions({
        cartItems: body.cartItems,
        customer_id: body.customer_id,
        isFirstPurchase: body.isFirstPurchase,
        cep: body.cep,
        couponCode: body.couponCode,
        shippingCost: body.shippingCost,
        descriptions: []
      });
      res.json(result);
    } catch (err) {
      console.error("Erro em ApplyPromotionController.apply:", err);
      res.status(500).json({ error: "Erro ao aplicar promoções" });
    }
  }
}

// Aqui já registramos a rota no mesmo arquivo, para não esquecer
export const PromotionRoutes = Router().post(
  "/promotions/apply",
  ApplyPromotionController.apply
);
