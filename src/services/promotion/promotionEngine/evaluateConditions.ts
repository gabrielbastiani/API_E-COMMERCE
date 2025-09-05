import { PromotionCondition, ConditionType, Operator } from "@prisma/client";
import { CartContext } from "./types";
import { compareArray, compareBoolean, compareNumber } from "./compareUtils";

export function evaluateConditions(
    conditions: PromotionCondition[],
    cart: CartContext,
    userState: string | null
): boolean {
    for (const cond of conditions) {
        const value = cond.value as Record<string, any>;
        let ok = true;

        try {
            switch (cond.type) {
                case ConditionType.STATE:
                    if (!userState) { ok = false; break; }
                    const states: string[] = Array.isArray(value.states) ? value.states : [];
                    ok = cond.operator === Operator.NOT_EQUAL ? !states.includes(userState) : states.includes(userState);
                    break;

                case ConditionType.FIRST_ORDER:
                    ok = compareBoolean(Boolean(cart.isFirstPurchase), cond.operator, Boolean(value.firstOrder));
                    break;

                case ConditionType.CART_ITEM_COUNT: {
                    const totalQty = cart.items.reduce((sum, i) => sum + i.quantity, 0);
                    ok = compareNumber(totalQty, cond.operator, Number(value.qty) || 0);
                    break;
                }

                case ConditionType.CATEGORY: {
                    const allowedCats: string[] = Array.isArray(value.categoryIds) ? value.categoryIds : [];
                    const presentCatsSet = new Set<string>();
                    for (const it of cart.items) {
                        const list = Array.isArray(it.categoryIds) ? it.categoryIds : [];
                        for (const c of list) presentCatsSet.add(c);
                    }
                    const presentCats = Array.from(presentCatsSet);
                    const anyMatch = allowedCats.length > 0 && cart.items.some(it => (it.categoryIds || []).some((c) => allowedCats.includes(c)));
                    const allItemsInAllowed = allowedCats.length > 0 && cart.items.every(it => (it.categoryIds || []).some((c) => allowedCats.includes(c)));

                    switch (cond.operator) {
                        case Operator.CONTAINS: ok = anyMatch; break;
                        case Operator.NOT_CONTAINS: ok = !anyMatch; break;
                        case Operator.EQUAL:
                        case Operator.EVERY:
                            ok = cart.items.length > 0 ? allItemsInAllowed : false;
                            break;
                        case Operator.NOT_EQUAL:
                            ok = !(cart.items.length > 0 ? allItemsInAllowed : false);
                            break;
                        default: ok = false;
                    }
                    console.log(`[PromotionEngine] CATEGORY cond eval: allowed=${JSON.stringify(allowedCats)} present=${JSON.stringify(presentCats)} op=${cond.operator} => ${ok}`);
                    break;
                }

                case ConditionType.CATEGORY_ITEM_COUNT: {
                    const want = Number(value.qty) || 0;
                    const allowedCats2: string[] = Array.isArray(value.categoryIds) ? value.categoryIds : [];
                    const actualCount = cart.items
                        .filter((item) => item.categoryIds && item.categoryIds.some((cat) => allowedCats2.includes(cat)))
                        .reduce((sum, i) => sum + i.quantity, 0);
                    ok = compareNumber(actualCount, cond.operator, want);
                    break;
                }

                case ConditionType.CATEGORY_VALUE: {
                    const want = Number(value.qtyOrValue) || 0;
                    const allowedCats3: string[] = Array.isArray(value.categoryIds) ? value.categoryIds : [];
                    const actualValue = cart.items
                        .filter((item) => item.categoryIds && item.categoryIds.some((c) => allowedCats3.includes(c)))
                        .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
                    ok = compareNumber(actualValue, cond.operator, want);
                    break;
                }

                case ConditionType.BRAND_VALUE: {
                    const want = Number(value.brandValue) || 0;
                    const allowedBrands: string[] = Array.isArray(value.brandNames) ? value.brandNames : [];
                    const actualValue = cart.items
                        .filter((item) => allowedBrands.includes(item.brand ?? ""))
                        .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
                    ok = compareNumber(actualValue, cond.operator, want);
                    break;
                }

                case ConditionType.PRODUCT_ITEM_COUNT: {
                    const want = Number(value.qty) || 0;
                    const targets: string[] = Array.isArray(value.productIds) ? value.productIds : [];
                    const actualCount = cart.items
                        .filter((i) => targets.includes(i.productId))
                        .reduce((sum, i) => sum + i.quantity, 0);
                    ok = compareNumber(actualCount, cond.operator, want);
                    break;
                }

                case ConditionType.UNIQUE_VARIANT_COUNT: {
                    const variants = Array.isArray(value.variantIds) ? value.variantIds : [];
                    const uniqCount = new Set(
                        variants.length > 0
                            ? cart.items.filter((i) => variants.includes(i.variantId ?? "")).map((i) => i.variantId)
                            : cart.items.map((i) => i.variantId)
                    ).size;
                    ok = compareNumber(uniqCount, cond.operator, Number(value.qty) || 0);
                    break;
                }

                case ConditionType.PRODUCT_CODE: {
                    const expected: string[] = Array.isArray(value.productIds) ? value.productIds : [];
                    const matchAll = value.matchAll === true;
                    ok = compareArray(cart.items.map((i) => i.productId), cond.operator, expected, matchAll);
                    break;
                }

                case ConditionType.VARIANT_CODE: {
                    const expected: string[] = Array.isArray(value.variantIds) ? value.variantIds : [];
                    const matchAll = value.matchAll === true;
                    ok = compareArray(cart.items.map((i) => i.variantId ?? ""), cond.operator, expected, matchAll);
                    break;
                }

                case ConditionType.ZIP_CODE: {
                    const userZip = (cart.cep ?? "").replace(/\D/g, "");
                    const fromZip = String(value.zipFrom ?? "").replace(/\D/g, "");
                    const toZip = String(value.zipTo ?? "").replace(/\D/g, "");
                    if (!userZip || !fromZip || !toZip) { ok = false; break; }
                    const z = +userZip, f = +fromZip, t = +toZip;
                    switch (cond.operator) {
                        case Operator.CONTAINS: ok = z >= f && z <= t; break;
                        case Operator.NOT_CONTAINS: ok = z < f || z > t; break;
                        case Operator.EQUAL: ok = z === f; break;
                        case Operator.NOT_EQUAL: ok = z !== f; break;
                        default: ok = false;
                    }
                    break;
                }

                default:
                    ok = true;
            }
        } catch (err) {
            ok = false;
            console.log(`[PromotionEngine] error evaluating condition ${cond.id}:`, err);
        }

        if (!ok) {
            console.log(
                `[PromotionEngine] promo condition failed: promoCondId=${cond.id} type=${cond.type} operator=${cond.operator} value=${JSON.stringify(cond.value)}`
            );
            return false;
        }
    }

    return true;
}