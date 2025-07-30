declare namespace Express {
    export interface Request {
        user_id?: string;
        name?: string;
        customer_id?: string;
        id_delete?: string;
    }
}

// src/promotions/types.ts
export enum ConditionType {
    FIRST_PURCHASE = "FIRST_PURCHASE",
    CART_QUANTITY = "CART_QUANTITY",
    PRODUCT_CATEGORY = "PRODUCT_CATEGORY",
    // … listar todos os `ConditionType` do seu enum no Prisma
}

export enum Operator {
    EQUAL = "Equal",
    NOT_EQUAL = "Different",
    GREATER = "Greater",
    LESS = "Less",
    CONTAINS = "Contains",
    NOT_CONTAINS = "NotContains",
    // … etc
}

export enum ActionType {
    DISCOUNT_UNIT_VARIANT = "DISCOUNT_UNIT_VARIANT",
    DISCOUNT_PERCENT_CATEGORY = "DISCOUNT_PERCENT_CATEGORY",
    FREE_GIFT = "FREE_GIFT",
    // … todos os tipos de `ActionType`
}

// E o shape mínimo do carrinho:
export interface CartItem {
    brand: string;
    variantId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    categoryIds: string[];
    brand: string;
}

export interface CartContext {
    userType: string;
    state: string;
    items: CartItem[];
    userId?: string;
    isFirstPurchase: boolean;
    cep?: string;
    subtotal: number;
    total: number;
    shipping: number;
}