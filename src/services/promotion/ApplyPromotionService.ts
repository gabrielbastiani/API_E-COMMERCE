import { PrismaClient } from "@prisma/client";
import { PromotionEngine, PromotionEngineResult } from "./PromotionEngine";
import { CartContext, CartItem } from "../../../@types";

const prisma = new PrismaClient();

export interface ApplyPromotionsInput {
  cartItems: Array<{
    variantId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  customer_id: string | null;
  isFirstPurchase: boolean;
  cep: string | null;
  couponCode: string | null;
  shippingCost: number;
  descriptions: string[];
}

export type ApplyPromotionsResult = PromotionEngineResult;

export class PromotionService {
  static async applyPromotions(input: ApplyPromotionsInput): Promise<ApplyPromotionsResult> {
    // 1) Busca em lote todos os produtos que estão no carrinho, incluindo suas categorias
    const productIds = Array.from(new Set(input.cartItems.map(i => i.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        categories: {
          select: { category_id: true }
        }
      }
    });
    // 2) Monta mapas productId → [category_id] e productId → brand
    const categoryMap = new Map<string, string[]>();
    const brandMap = new Map<string, string>();
    for (const p of products) {
      categoryMap.set(
        p.id,
        p.categories.map((pc) => pc.category_id)
      );
      brandMap.set(p.id, p.brand ?? "");
    }

    // 3) Constrói o CartContext injetando categoryIds em cada item
    const items: CartItem[] = input.cartItems.map(i => ({
      variantId: i.variantId,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      categoryIds: categoryMap.get(i.productId) || [],
      brand: brandMap.get(i.productId) || "",
    }));

    const cartContext: CartContext = {
      items,
      userId: input.customer_id ?? "",
      userType: "",
      state: "",
      isFirstPurchase: input.isFirstPurchase,
      cep: input.cep ?? "",
      subtotal: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      shipping: input.shippingCost,
      total: 0
    };

    // 4) Chama o engine
    return await PromotionEngine.applyPromotions(
      cartContext,
      input.couponCode ?? undefined
    );
  }
}