import {
  PrismaClient,
  PromotionCondition,
  ActionType,
  ConditionType,
  Operator,
  StatusPromotion,
} from "@prisma/client";
import { CartContext } from "../../../@types";

const prisma = new PrismaClient();

export interface PromotionDetail {
  id: string;
  name: string;
  description: string;
  discount: number;
  type: 'product' | 'shipping' | 'mixed';
}

export interface PromotionEngineResult {
  discountTotal: number;
  productDiscount: number;
  shippingDiscount: number;
  freeGifts: Array<{ variantId: string; quantity: number }>;
  badgeMap: Record<string, { title: string; imageUrl: string }>;
  descriptions: string[];
  promotions: PromotionDetail[];
}

export class PromotionEngine {
  static async applyPromotions(
    cart: CartContext,
    couponCode?: string
  ): Promise<PromotionEngineResult> {
    // 1) Buscar todas as promoções ativas
    const allPromos = await prisma.promotion.findMany({
      where: {
        status: StatusPromotion.Disponivel,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        conditions: true,
        actions: true,
        coupons: true,
        badges: true,
        variantPromotions: true,
      },
      orderBy: { priority: "desc" },
    });

    console.log(allPromos)

    // 2) separa promoções automáticas (sem cupom) das que exigem cupom
    const autoPromos = allPromos.filter((p) => !p.hasCoupon);
    const couponPromos = couponCode
      ? allPromos.filter(
        (p) =>
          p.hasCoupon &&
          p.coupons.some((c) => c.code === couponCode)
      )
      : [];

    // 3) se houver cupom e a promoção não permitir multipleCoupons, pega só a de maior prioridade
    let selectedCouponPromos: typeof allPromos = [];
    if (couponPromos.length > 0) {
      if (!couponPromos[0].multipleCoupons) {
        selectedCouponPromos = [couponPromos[0]];
      } else {
        selectedCouponPromos = couponPromos;
      }
    }

    // 4) concatena mantendo prioridade geral
    const toApply = [...autoPromos, ...selectedCouponPromos].sort(
      (a, b) => b.priority - a.priority
    );

    console.log(
      "→ Promoções automáticas:",
      autoPromos.map((p) => p.name)
    );
    console.log(
      `→ Promoções de cupom (“${couponCode}”):`,
      selectedCouponPromos.map((p) => p.name)
    );

    // 5) aplica cada promoção até que uma não seja cumulativa
    let productDiscount = 0;
    let shippingDiscount = 0;
    const freeGifts: Array<{ variantId: string; quantity: number }> = [];
    const badgeMap: Record<string, { title: string; imageUrl: string }> = {};
    const descriptions: string[] = [];

    const promotions: PromotionDetail[] = [];

    for (const promo of toApply) {
      // checa condições
      if (!this.evaluateConditions(promo.conditions, cart)) continue;

      let before = productDiscount + shippingDiscount;

      // armazena descrição para retornar
      descriptions.push(promo.description ?? "");

      console.log(`→ [${promo.name}] aplicando ações:`);
      // executa ações
      for (const act of promo.actions) {
        const p = act.params as any;
        switch (act.type) {
          case ActionType.FIXED_SHIPPING:
            shippingDiscount += p.amount;
            console.log(`   FIXED_SHIPPING  -${p.amount}`);
            break;
          case ActionType.MAX_SHIPPING_DISCOUNT: {
            const appl = Math.min(cart.shipping, p.amount);
            shippingDiscount += appl;
            console.log(`   MAX_SHIPPING_DISCOUNT  -${appl}`);
            break;
          }
          case ActionType.PERCENT_SHIPPING: {
            const pct = (cart.shipping * p.amount) / 100;
            shippingDiscount += pct;
            console.log(
              `   PERCENT_SHIPPING ${p.amount}%  -${pct.toFixed(2)}`
            );
            break;
          }
          case ActionType.FREE_VARIANT_ITEM:
            (p.variantIds as string[]).forEach((vid) =>
              freeGifts.push({ variantId: vid, quantity: p.qty })
            );
            console.log(
              `   FREE_VARIANT_ITEM  ${p.qty}× variantes ${p.variantIds}`
            );
            break;
          case ActionType.FREE_PRODUCT_ITEM:
            (p.productIds as string[]).forEach((pid) =>
              freeGifts.push({ variantId: pid, quantity: p.qty })
            );
            console.log(
              `   FREE_PRODUCT_ITEM  ${p.qty}× produtos ${p.productIds}`
            );
            break;
          case ActionType.FIXED_VARIANT_DISCOUNT:
            cart.items
              .filter((i) => (p.variantIds as string[]).includes(i.variantId))
              .forEach((i) => {
                productDiscount += p.amount * i.quantity;
              });
            break;
          case ActionType.PERCENT_PRODUCT:
            cart.items.forEach((i) => {
              if ((p.productIds as string[]).includes(i.productId)) {
                productDiscount +=
                  (i.unitPrice * i.quantity * p.percent) / 100;
              }
            });
            break;
          case ActionType.PERCENT_ITEM_COUNT:
            cart.items.forEach((i) => {
              if (
                (p.productIds as string[]).includes(i.productId) &&
                i.quantity >= p.qty
              ) {
                productDiscount +=
                  (i.unitPrice * p.qty * p.percent) / 100;
              }
            });
            break;
          case ActionType.FIXED_PRODUCT_DISCOUNT:
            cart.items
              .filter((i) => (p.productIds as string[]).includes(i.productId))
              .forEach((i) => {
                productDiscount += p.amount * i.quantity;
              });
            break;
          case ActionType.FIXED_BRAND_ITEMS:
            cart.items.forEach((i) => {
              // TODO: substituir pelo brand real de i.productId
              const brand = "";
              if ((p.brandNames as string[]).includes(brand)) {
                productDiscount += p.amount * i.quantity;
              }
            });
            break;
          case ActionType.FIXED_SUBTOTAL:
            productDiscount += p.amount;
            break;
          case ActionType.FIXED_TOTAL_NO_SHIPPING:
            productDiscount += p.amount;
            break;
          case ActionType.FIXED_TOTAL_PER_PRODUCT:
            cart.items.forEach((i) => {
              productDiscount += p.amount * i.quantity;
            });
            break;
          case ActionType.PERCENT_BRAND_ITEMS:
            cart.items.forEach((i) => {
              // TODO: substituir pelo brand real de i.productId
              const brand = "";
              if ((p.brandNames as string[]).includes(brand)) {
                productDiscount +=
                  (i.unitPrice * i.quantity * p.percent) / 100;
              }
            });
            break;
          case ActionType.PERCENT_CATEGORY:
            cart.items.forEach((i) => {
              // TODO: verificar categoria de i.productId
              const catId = "";
              if ((p.categoryIds as string[]).includes(catId)) {
                productDiscount +=
                  (i.unitPrice * i.quantity * p.percent) / 100;
              }
            });
            break;
          case ActionType.PERCENT_VARIANT:
            cart.items.forEach((i) => {
              if ((p.variantIds as string[]).includes(i.variantId)) {
                productDiscount +=
                  (i.unitPrice * i.quantity * p.percent) / 100;
              }
            });
            break;
          case ActionType.PERCENT_EXTREME_ITEM: {
            const arr = cart.items.filter((i) =>
              (p.variantIds as string[]).includes(i.variantId)
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
                productDiscount += (item.unitPrice * p.percent) / 100;
              }
            }
            break;
          }
          case ActionType.PERCENT_SUBTOTAL:
            productDiscount += (cart.subtotal * p.amount) / 100;
            break;
          case ActionType.PERCENT_TOTAL_NO_SHIPPING:
            productDiscount += (cart.subtotal * p.amount) / 100;
            break;
          case ActionType.PERCENT_TOTAL_PER_PRODUCT: {
            // 1) Se houver uma lista de inclusão/exclusão nos params, respeitar:
            const includeIds: string[] = Array.isArray(p.productIds)
              ? (p.productIds as string[])
              : [];
            const excludeIds: string[] = Array.isArray(p.excludeProductIds)
              ? (p.excludeProductIds as string[])
              : [];

            cart.items.forEach((i) => {
              // se houver includeIds, só aplica neles
              if (includeIds.length && !includeIds.includes(i.productId)) return;
              // se houver excludeIds, pula esses
              if (excludeIds.length && excludeIds.includes(i.productId)) return;

              productDiscount += (i.unitPrice * i.quantity * p.amount) / 100;
            });
            break;
          }

          default:
            console.log(`   Ação não tratada: ${act.type}`);
        }
      }

      // aplica selos
      for (const badge of promo.badges) {
        if (promo.variantPromotions.length) {
          promo.variantPromotions.forEach((v) => {
            badgeMap[v.id] = {
              title: badge.title,
              imageUrl: badge.imageUrl,
            };
          });
        } else {
          cart.items.forEach((i) => {
            badgeMap[i.variantId] = {
              title: badge.title,
              imageUrl: badge.imageUrl,
            };
          });
        }
      }

      let after = productDiscount + shippingDiscount;
      const delta = Number((after - before).toFixed(2));

      promotions.push({
        id: promo.id,
        name: promo.name,
        description: promo.description ?? '',
        discount: delta,
        type:
          delta === 0
            ? 'mixed'
            : shippingDiscount - (before - productDiscount) > 0
              ? 'shipping'
              : 'product',
      });

      if (!promo.cumulative) break;

    }

    const discountTotal = productDiscount + shippingDiscount;
    console.log(
      `→ Desconto total: R$${discountTotal.toFixed(
        2
      )} (produto R$${productDiscount.toFixed(
        2
      )} + frete R$${shippingDiscount.toFixed(2)})`
    );

    return {
      discountTotal,
      productDiscount,
      shippingDiscount,
      freeGifts,
      badgeMap,
      descriptions,
      promotions,
    };
  }

  private static evaluateConditions(
    conditions: PromotionCondition[],
    cart: CartContext
  ): boolean {
    return conditions.every((cond) => {
      const value = cond.value as Record<string, any>;
      switch (cond.type) {
        case ConditionType.FIRST_ORDER:
          return this.compareBoolean(
            cart.isFirstPurchase,
            cond.operator,
            Boolean(value.firstOrder)
          );

        case ConditionType.CART_ITEM_COUNT: {
          const totalQty = cart.items.reduce((sum, i) => sum + i.quantity, 0);
          return this.compareNumber(totalQty, cond.operator, Number(value.qty) || 0);
        }

        case ConditionType.CATEGORY_ITEM_COUNT: {
          const want = Number(value.qty) || 0;
          const allowedCats: string[] = Array.isArray(value.categoryIds)
            ? value.categoryIds
            : [];
          const actualCount = cart.items
            .filter((item) =>
              item.categoryIds.some((cat) => allowedCats.includes(cat))
            )
            .reduce((sum, i) => sum + i.quantity, 0);
          return this.compareNumber(actualCount, cond.operator, want);
        }

        case ConditionType.CATEGORY_VALUE: {
          const want = Number(value.qtyOrValue) || 0;
          const allowedCats: string[] = Array.isArray(value.categoryIds)
            ? value.categoryIds
            : [];
          const actualValue = cart.items
            .filter((item) =>
              item.categoryIds.some((c) => allowedCats.includes(c))
            )
            .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
          return this.compareNumber(actualValue, cond.operator, want);
        }

        case ConditionType.BRAND_VALUE: {
          const want = Number(value.brandValue) || 0;
          const allowedBrands: string[] = Array.isArray(value.brandNames)
            ? value.brandNames
            : [];
          const actualValue = cart.items
            .filter((item) => allowedBrands.includes(item.brand))
            .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
          return this.compareNumber(actualValue, cond.operator, want);
        }

        case ConditionType.PRODUCT_ITEM_COUNT: {
          const want = Number(value.qty) || 0;
          const targets: string[] = Array.isArray(value.productIds)
            ? value.productIds
            : [];
          const actualCount = cart.items
            .filter((i) => targets.includes(i.productId))
            .reduce((sum, i) => sum + i.quantity, 0);
          return this.compareNumber(actualCount, cond.operator, want);
        }

        case ConditionType.UNIQUE_VARIANT_COUNT:
          const variants = Array.isArray(value.variantIds)
            ? value.variantIds
            : [];
          const uniqCount = new Set(
            variants.length > 0
              ? cart.items
                .filter((i) => variants.includes(i.variantId))
                .map((i) => i.variantId)
              : cart.items.map((i) => i.variantId)
          ).size;
          return this.compareNumber(
            uniqCount,
            cond.operator,
            Number(value.qty) || 0
          );

        case ConditionType.PRODUCT_CODE:
          return this.compareArray(
            cart.items.map((i) => i.productId),
            cond.operator,
            Array.isArray(value.productIds) ? value.productIds : []
          );

        case ConditionType.VARIANT_CODE:
          return this.compareArray(
            cart.items.map((i) => i.variantId),
            cond.operator,
            Array.isArray(value.variantIds) ? value.variantIds : []
          );

        case ConditionType.ZIP_CODE: {
          const userZip = (cart.cep ?? "").replace(/\D/g, "");
          const fromZip = String(value.zipFrom ?? "").replace(/\D/g, "");
          const toZip = String(value.zipTo ?? "").replace(/\D/g, "");
          if (!userZip || !fromZip || !toZip) return false;
          const z = +userZip, f = +fromZip, t = +toZip;
          switch (cond.operator) {
            case Operator.CONTAINS:
              return z >= f && z <= t;
            case Operator.NOT_CONTAINS:
              return z < f || z > t;
            case Operator.EQUAL:
              return z === f;
            case Operator.NOT_EQUAL:
              return z !== f;
            default:
              return false;
          }
        }

        // … (outros tipos de condição seguem o mesmo padrão) …

        default:
          return true;
      }
    });
  }

  private static compareNumber(
    actual: number,
    operator: Operator,
    expected: number
  ): boolean {
    switch (operator) {
      case Operator.EQUAL:
        return actual === expected;
      case Operator.NOT_EQUAL:
        return actual !== expected;
      case Operator.GREATER:
        return actual > expected;
      case Operator.GREATER_EQUAL:
        return actual >= expected;
      case Operator.LESS:
        return actual < expected;
      case Operator.LESS_EQUAL:
        return actual <= expected;
    }
    return false;
  }

  private static compareBoolean(
    actual: boolean,
    operator: Operator,
    expected: boolean
  ): boolean {
    return operator === Operator.EQUAL ? actual === expected : actual !== expected;
  }

  private static compareArray(
    actual: string[],
    operator: Operator,
    expected: string[]
  ): boolean {
    switch (operator) {
      case Operator.CONTAINS:
        return expected.every((v) => actual.includes(v));
      case Operator.NOT_CONTAINS:
        return expected.every((v) => !actual.includes(v));
      case Operator.EQUAL:
        return (
          actual.length === expected.length &&
          expected.every((v) => actual.includes(v))
        );
      case Operator.NOT_EQUAL:
        return !(
          actual.length === expected.length &&
          expected.every((v) => actual.includes(v))
        );
    }
    return false;
  }

  private static compareString(
    actual: string,
    operator: Operator,
    [from, to]: [string, string]
  ): boolean {
    switch (operator) {
      case Operator.CONTAINS:
        return actual.includes(from);
      case Operator.NOT_CONTAINS:
        return !actual.includes(from);
      case Operator.EQUAL:
        return actual === from;
      case Operator.NOT_EQUAL:
        return actual !== from;
    }
    return false;
  }
}