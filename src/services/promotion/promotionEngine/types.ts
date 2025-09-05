import { PromotionCondition } from "@prisma/client";

export interface PromotionDetail {
    id: string;
    name: string;
    description: string;
    discount: number;
    type: "product" | "shipping" | "mixed";
    display?:
    | { kind: "percent"; percent: number; amount: number }
    | { kind: "currency"; amount: number }
    | { kind: "none" };
}

export interface PromotionEngineResult {
    discountTotal: number;
    productDiscount: number;
    shippingDiscount: number;
    freeGifts: Array<{
        productId?: string;
        variantId?: string;
        sku?: string;
        quantity: number;
        isVariant: boolean;
        name?: string;
        unitPrice?: number | null;
    }>;
    badgeMap: Record<string, { title: string; imageUrl: string }>;
    descriptions: string[];
    promotions: PromotionDetail[];
}

export interface CartItem {
    variantId?: string | null;
    productId: string;
    quantity: number;
    unitPrice: number;
    categoryIds?: string[];
    brand?: string;
}

export interface CartContext {
    items: CartItem[];
    userId?: string;
    isFirstPurchase?: boolean;
    cep?: string;
    subtotal: number;
    shipping: number;
    total: number;
}

export type PromoMetaKind = "none" | "percent" | "currency" | "mixed";

export { PromotionCondition };