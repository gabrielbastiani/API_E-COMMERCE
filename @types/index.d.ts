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
    FIRST_ORDER = "FIRST_ORDER",
    CART_ITEM_COUNT = "CART_ITEM_COUNT",
    UNIQUE_VARIANT_COUNT = "UNIQUE_VARIANT_COUNT",
    ZIP_CODE = "ZIP_CODE",
    PRODUCT_CODE = "PRODUCT_CODE",
    VARIANT_CODE = "VARIANT_CODE",
    STATE = "STATE",
    CATEGORY = "CATEGORY",
    CATEGORY_ITEM_COUNT = "CATEGORY_ITEM_COUNT",
    CATEGORY_VALUE = "CATEGORY_VALUE",
    BRAND_VALUE = "BRAND_VALUE",
    VARIANT_ITEM_COUNT = "VARIANT_ITEM_COUNT",
    PRODUCT_ITEM_COUNT = "PRODUCT_ITEM_COUNT",
    PERSON_TYPE = "PERSON_TYPE",
    USER = "USER",
    SUBTOTAL_VALUE = "SUBTOTAL_VALUE",
    TOTAL_VALUE = "TOTAL_VALUE"
}

export enum Operator {
    EQUAL = "Equal",
    NOT_EQUAL = "Different",
    GREATER = "Greater",
    GREATER_EQUAL = "GreaterEqual",
    LESS = "Less",
    LESS_EQUAL = "LessEqual",
    CONTAINS = "Contains",
    NOT_CONTAINS = "NotContains",
    EVERY = "Every"
}

export enum ActionType {
    DISCOUNT_UNIT_VARIANT = "DISCOUNT_UNIT_VARIANT",
    DISCOUNT_PERCENT_CATEGORY = "DISCOUNT_PERCENT_CATEGORY",
    FREE_GIFT = "FREE_GIFT",
    FIXED_VARIANT_DISCOUNT = "FIXED_VARIANT_DISCOUNT",
    FIXED_PRODUCT_DISCOUNT = "FIXED_PRODUCT_DISCOUNT",
    FREE_VARIANT_ITEM = "FREE_VARIANT_ITEM",
    FREE_PRODUCT_ITEM = "FREE_PRODUCT_ITEM",
    PERCENT_CATEGORY = "PERCENT_CATEGORY",
    PERCENT_VARIANT = "PERCENT_VARIANT",
    PERCENT_PRODUCT = "PERCENT_PRODUCT",
    PERCENT_BRAND_ITEMS = "PERCENT_BRAND_ITEMS",
    PERCENT_ITEM_COUNT = "PERCENT_ITEM_COUNT",
    PERCENT_EXTREME_ITEM = "PERCENT_EXTREME_ITEM",
    PERCENT_SHIPPING = "PERCENT_SHIPPING",
    PERCENT_SUBTOTAL = "PERCENT_SUBTOTAL",
    PERCENT_TOTAL_NO_SHIPPING = "PERCENT_TOTAL_NO_SHIPPING",
    PERCENT_TOTAL_PER_PRODUCT = "PERCENT_TOTAL_PER_PRODUCT",
    FIXED_BRAND_ITEMS = "FIXED_BRAND_ITEMS",
    FIXED_SHIPPING = "FIXED_SHIPPING",
    FIXED_SUBTOTAL = "FIXED_SUBTOTAL",
    FIXED_TOTAL_NO_SHIPPING = "FIXED_TOTAL_NO_SHIPPING",
    FIXED_TOTAL_PER_PRODUCT = "FIXED_TOTAL_PER_PRODUCT",
    MAX_SHIPPING_DISCOUNT = "MAX_SHIPPING_DISCOUNT"
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