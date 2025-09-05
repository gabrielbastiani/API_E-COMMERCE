import { PrismaClient } from "@prisma/client";
import { CartContext, CartItem } from "../../../@types";
import { PromotionEngineResult } from "./promotionEngine/types";
import { PromotionEngine } from "./PromotionEngine";

const prisma = new PrismaClient();

export interface ApplyPromotionsInput {
  cartItems: Array<{ variantId: string | null; productId: string; quantity: number; unitPrice: number }>;
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
    // carregar produtos para mapear categorias e marcas
    const productIds = Array.from(new Set(input.cartItems.map((i) => i.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { categories: { select: { category_id: true } } },
    });

    const categoryMap = new Map<string, string[]>();
    const brandMap = new Map<string, string>();
    for (const p of products) {
      categoryMap.set(p.id, p.categories.map((pc) => pc.category_id));
      brandMap.set(p.id, p.brand ?? "");
    }

    // montar items com categoryIds e brand
    const items: CartItem[] = input.cartItems.map((i) => ({
      variantId: i.variantId ?? "",
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      categoryIds: categoryMap.get(i.productId) || [],
      brand: brandMap.get(i.productId) || "",
    }));

    // montar priceMap (productId e variantId -> unitPrice)
    const priceMap: Record<string, number> = {};
    for (const it of input.cartItems) {
      if (it.productId) priceMap[it.productId] = it.unitPrice;
      if (it.variantId) priceMap[it.variantId] = it.unitPrice;
    }

    const cartContext: CartContext = {
      items,
      userId: input.customer_id ?? "",
      userType: "",
      state: "",
      isFirstPurchase: input.isFirstPurchase,
      cep: input.cep ?? "",
      subtotal: items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
      shipping: input.shippingCost,
      total: 0,
      // adiciona priceMap para ajuda na estimativa de brindes
      // @ts-ignore - caso seu CartContext não declare priceMap, adicione na tipagem
      priceMap,
    };

    // delega para engine
    return await PromotionEngine.applyPromotions(cartContext, input.couponCode ?? undefined);
  }
}