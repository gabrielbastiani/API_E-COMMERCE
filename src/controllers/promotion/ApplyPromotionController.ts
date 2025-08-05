import { Request, Response, Router } from "express";
import { ApplyPromotionsInput, PromotionService } from "../../services/promotion/ApplyPromotionService";
import prisma from "../../prisma";

export class ApplyPromotionController {
  static async apply(req: Request, res: Response) {

    const body = req.body as any;
    const { customer_id } = body;
    // 🔍 Descobre quantos pedidos já existem para esse customer_id
    let isFirstPurchase = true;

    if (customer_id) {
      const count = await prisma.order.count({
        where: { customer_id }
      });
      isFirstPurchase = count === 0;
    }

    try {
      const body = req.body as ApplyPromotionsInput;
      const result = await PromotionService.applyPromotions({
        ...body,
        isFirstPurchase,
        cartItems: body.cartItems,
        customer_id: body.customer_id,
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
