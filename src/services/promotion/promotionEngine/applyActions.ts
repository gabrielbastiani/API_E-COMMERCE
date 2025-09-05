import { ActionType } from "@prisma/client";
import prisma from "./db";
import { CartContext } from "./types";

type AddDiscountFn = (value: number, kind: "currency" | "percent", pct?: number) => void;

export async function applyActionsToPromo(
    promo: any,
    cart: CartContext,
    freeGifts: Array<{
        productId?: string;
        variantId?: string;
        sku?: string;
        quantity: number;
        isVariant: boolean;
        name?: string;
        unitPrice?: number | null;
    }>,
    addProductDiscount: AddDiscountFn,
    addShippingDiscount: AddDiscountFn
) {
    for (const act of promo.actions) {
        const p = act.params as Record<string, any>;
        switch (act.type) {
            case ActionType.FIXED_SHIPPING: {
                const amount = Number(p.amount) || 0;
                addShippingDiscount(amount, "currency");
                break;
            }

            case ActionType.MAX_SHIPPING_DISCOUNT: {
                const amount = Number(p.amount) || 0;
                const appl = Math.min(cart.shipping, amount);
                addShippingDiscount(appl, "currency");
                break;
            }

            case ActionType.PERCENT_SHIPPING: {
                const pct = Number(p.amount) || Number(p.percent) || 0;
                const val = (cart.shipping * pct) / 100;
                addShippingDiscount(val, "percent", pct);
                break;
            }

            case ActionType.FREE_VARIANT_ITEM: {
                const qty = Number(p.qty) || 1;
                const variantIds: string[] = Array.isArray(p.variantIds) ? p.variantIds : [];
                for (const vid of variantIds) {
                    try {
                        const variant = await prisma.productVariant.findUnique({
                            where: { id: vid },
                            select: {
                                price_per: true,
                                sku: true,
                                product: { select: { name: true } },
                            },
                        });
                        freeGifts.push({
                            variantId: vid,
                            sku: variant?.sku ?? undefined,
                            quantity: qty,
                            isVariant: true,
                            name: variant?.product?.name ?? undefined,
                            unitPrice: variant?.price_per ?? null,
                        });
                    } catch (err) {
                        freeGifts.push({
                            variantId: vid,
                            quantity: qty,
                            isVariant: true,
                            unitPrice: null,
                        });
                    }
                }
                break;
            }

            case ActionType.FREE_PRODUCT_ITEM: {
                const qty = Number(p.qty) || 1;
                const productIds: string[] = Array.isArray(p.productIds) ? p.productIds : [];
                for (const pid of productIds) {
                    try {
                        const prod = await prisma.product.findUnique({
                            where: { id: pid },
                            select: { price_per: true, name: true },
                        });
                        freeGifts.push({
                            productId: pid,
                            quantity: qty,
                            isVariant: false,
                            name: prod?.name ?? undefined,
                            unitPrice: prod?.price_per ?? null,
                        });
                    } catch (err) {
                        freeGifts.push({
                            productId: pid,
                            quantity: qty,
                            isVariant: false,
                            unitPrice: null,
                        });
                    }
                }
                break;
            }

            case ActionType.FIXED_VARIANT_DISCOUNT:
                cart.items
                    .filter((i) => Array.isArray(p.variantIds) && (p.variantIds as string[]).includes(i.variantId ?? ""))
                    .forEach((i) => {
                        const val = (Number(p.amount) || 0) * i.quantity;
                        addProductDiscount(val, "currency");
                    });
                break;

            case ActionType.PERCENT_PRODUCT:
                cart.items.forEach((i) => {
                    if (Array.isArray(p.productIds) && (p.productIds as string[]).includes(i.productId)) {
                        const pct = Number(p.percent) || Number(p.amount) || 0;
                        const val = (i.unitPrice * i.quantity * pct) / 100;
                        addProductDiscount(val, "percent", pct);
                    }
                });
                break;

            case ActionType.PERCENT_ITEM_COUNT:
                cart.items.forEach((i) => {
                    if (
                        Array.isArray(p.productIds) &&
                        (p.productIds as string[]).includes(i.productId) &&
                        i.quantity >= p.qty
                    ) {
                        const pct = Number(p.percent) || 0;
                        const val = (i.unitPrice * p.qty * pct) / 100;
                        addProductDiscount(val, "percent", pct);
                    }
                });
                break;

            case ActionType.FIXED_PRODUCT_DISCOUNT:
                cart.items
                    .filter((i) => Array.isArray(p.productIds) && (p.productIds as string[]).includes(i.productId))
                    .forEach((i) => {
                        const val = (Number(p.amount) || 0) * i.quantity;
                        addProductDiscount(val, "currency");
                    });
                break;

            case ActionType.FIXED_BRAND_ITEMS:
                cart.items.forEach((i) => {
                    const brand = i.brand ?? "";
                    if (Array.isArray(p.brandNames) && (p.brandNames as string[]).includes(brand)) {
                        const val = (Number(p.amount) || 0) * i.quantity;
                        addProductDiscount(val, "currency");
                    }
                });
                break;

            case ActionType.FIXED_SUBTOTAL: {
                const val = Number(p.amount) || 0;
                addProductDiscount(val, "currency");
                break;
            }

            case ActionType.FIXED_TOTAL_NO_SHIPPING: {
                const val = Number(p.amount) || 0;
                addProductDiscount(val, "currency");
                break;
            }

            case ActionType.FIXED_TOTAL_PER_PRODUCT:
                cart.items.forEach((i) => {
                    const val = (Number(p.amount) || 0) * i.quantity;
                    addProductDiscount(val, "currency");
                });
                break;

            case ActionType.PERCENT_BRAND_ITEMS:
                cart.items.forEach((i) => {
                    const brand = i.brand ?? "";
                    if (Array.isArray(p.brandNames) && (p.brandNames as string[]).includes(brand)) {
                        const pct = Number(p.percent) || 0;
                        const val = (i.unitPrice * i.quantity * pct) / 100;
                        addProductDiscount(val, "percent", pct);
                    }
                });
                break;

            case ActionType.PERCENT_CATEGORY:
                cart.items.forEach((i) => {
                    const catIdList = i.categoryIds || [];
                    if (Array.isArray(p.categoryIds)) {
                        const intersect = catIdList.some((c) => (p.categoryIds as string[]).includes(c));
                        if (intersect) {
                            const pct = Number(p.percent) || 0;
                            const val = (i.unitPrice * i.quantity * pct) / 100;
                            addProductDiscount(val, "percent", pct);
                        }
                    }
                });
                break;

            case ActionType.PERCENT_VARIANT:
                cart.items.forEach((i) => {
                    if (Array.isArray(p.variantIds) && (p.variantIds as string[]).includes(i.variantId ?? "")) {
                        const pct = Number(p.percent) || 0;
                        const val = (i.unitPrice * i.quantity * pct) / 100;
                        addProductDiscount(val, "percent", pct);
                    }
                });
                break;

            case ActionType.PERCENT_EXTREME_ITEM: {
                const arr = cart.items.filter((i) =>
                    Array.isArray(p.variantIds) && (p.variantIds as string[]).includes(i.variantId ?? "")
                );
                if (arr.length) {
                    const prices = arr.map((i) => i.unitPrice);
                    const target = p.lowest
                        ? Math.min(...prices)
                        : p.highest
                            ? Math.max(...prices)
                            : 0;
                    const item = arr.find((i) => i.unitPrice === target);
                    if (item) {
                        const pct = Number(p.percent) || 0;
                        const val = (item.unitPrice * pct) / 100;
                        addProductDiscount(val, "percent", pct);
                    }
                }
                break;
            }

            case ActionType.PERCENT_SUBTOTAL: {
                const pct = Number(p.amount) || Number(p.percent) || 0;
                const val = (cart.subtotal * pct) / 100;
                addProductDiscount(val, "percent", pct);
                break;
            }

            case ActionType.PERCENT_TOTAL_NO_SHIPPING: {
                const pct = Number(p.amount) || Number(p.percent) || 0;
                const val = (cart.subtotal * pct) / 100;
                addProductDiscount(val, "percent", pct);
                break;
            }

            case ActionType.PERCENT_TOTAL_PER_PRODUCT: {
                const includeIds: string[] = Array.isArray(p.productIds) ? p.productIds : [];
                const excludeIds: string[] = Array.isArray(p.excludeProductIds) ? p.excludeProductIds : [];

                cart.items.forEach((i) => {
                    if (includeIds.length && !includeIds.includes(i.productId)) return;
                    if (excludeIds.length && excludeIds.includes(i.productId)) return;

                    const pct = Number(p.amount) || 0;
                    const val = (i.unitPrice * i.quantity * pct) / 100;
                    addProductDiscount(val, "percent", pct);
                });
                break;
            }

            default:
                console.log(`   Ação não tratada: ${act.type}`);
        }
    }
}