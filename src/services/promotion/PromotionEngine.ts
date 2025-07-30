import {
  PrismaClient,
  PromotionCondition,
  ActionType,
  ConditionType,
  Operator,
} from "@prisma/client";
import { CartContext } from "../../../@types";

const prisma = new PrismaClient();

export interface PromotionEngineResult {
  discountTotal: number;
  productDiscount: number;
  shippingDiscount: number;
  freeGifts: Array<{ variantId: string; quantity: number }>;
  badgeMap: Record<string, { title: string; imageUrl: string }>;
  descriptions: string[];
}

export class PromotionEngine {
  static async applyPromotions(
    cart: CartContext,
    couponCode?: string
  ): Promise<PromotionEngineResult> {
    // 1) Buscar todas as promoções ativas
    const allPromos = await prisma.promotion.findMany({
      where: {
        active: true,
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

    // 2) Filtrar por cupom (ou promoções sem cupom)
    const filtered = couponCode
      ? allPromos.filter((p) =>
        p.coupons.some((c) => c.code === couponCode)
      )
      : allPromos.filter((p) => !p.hasCoupon);

    let productDiscount = 0;
    let shippingDiscount = 0;
    const freeGifts: Array<{ variantId: string; quantity: number }> = [];
    const badgeMap: Record<string, { title: string; imageUrl: string }> = {};
    const descriptions: string[] = [];

    // 3) Iterar sobre as promoções filtradas
    for (const promo of filtered) {
      // 3.1) Checar condições
      if (!this.evaluateConditions(promo.conditions, cart)) continue;
      descriptions.push(promo.description || "");

      // 3.2) Aplicar ações
      for (const act of promo.actions) {
        const p = act.params as any;
        switch (act.type) {
          // ─── FIXED DISCOUNTS ───────────────────────────────
          case ActionType.FIXED_VARIANT_DISCOUNT:
            cart.items
              .filter((i) => (p.variantIds as string[]).includes(i.variantId))
              .forEach((i) => {
                productDiscount += p.amount * i.quantity;
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

          // ─── PERCENT DISCOUNTS ─────────────────────────────
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

          case ActionType.PERCENT_PRODUCT:
            cart.items.forEach((i) => {
              if ((p.productIds as string[]).includes(i.productId)) {
                productDiscount +=
                  (i.unitPrice * i.quantity * p.percent) / 100;
              }
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



          // ─── SHIPPING DISCOUNTS ────────────────────────────
          case ActionType.FIXED_SHIPPING:
            shippingDiscount += p.amount;
            break;

          case ActionType.MAX_SHIPPING_DISCOUNT:
            shippingDiscount += Math.min(cart.shipping, p.amount);
            break;

          case ActionType.PERCENT_SHIPPING:
            shippingDiscount += (cart.shipping * p.amount) / 100;
            break;

          // ─── FREE GIFTS ────────────────────────────────────
          case ActionType.FREE_VARIANT_ITEM:
            (p.variantIds as string[]).forEach((vid) =>
              freeGifts.push({ variantId: vid, quantity: p.qty })
            );
            break;

          case ActionType.FREE_PRODUCT_ITEM:
            (p.productIds as string[]).forEach((pid) =>
              freeGifts.push({ variantId: pid, quantity: p.qty })
            );
            break;

          default:
            // nenhuma ação faltante
            break;
        }
      }

      // 3.3) Aplicar selos
      for (const badge of promo.badges) {
        if (promo.variantPromotions.length) {
          promo.variantPromotions.forEach((v) => {
            badgeMap[v.id] = { title: badge.title, imageUrl: badge.imageUrl };
          });
        } else {
          cart.items.forEach((i) => {
            badgeMap[i.variantId] = { title: badge.title, imageUrl: badge.imageUrl };
          });
        }
      }

      if (!promo.cumulative) break;
    }

    const discountTotal = productDiscount + shippingDiscount;
    return {
      discountTotal,
      productDiscount,
      shippingDiscount,
      freeGifts,
      badgeMap,
      descriptions
    };
  }

  private static evaluateConditions(
    conditions: PromotionCondition[],
    cart: CartContext
  ): boolean {
    return conditions.every((cond) => {
      const value = (cond.value as unknown) as Record<string, any>;
      switch (cond.type) {
        case ConditionType.FIRST_ORDER:
          return this.compareBoolean(
            cart.isFirstPurchase,
            cond.operator,
            Boolean(value.firstOrder)
          );

        case ConditionType.CART_ITEM_COUNT:
          const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0);
          return this.compareNumber(
            totalQty,
            cond.operator,
            Number(value.qty) || 0
          );

        case ConditionType.CATEGORY_ITEM_COUNT: {
          const want = Number(value.qty) || 0;
          const allowedCats: string[] = Array.isArray(value.categoryIds) ? value.categoryIds : [];

          // Soma a quantidade de _itens_ (i.quantity) cujas categorias batem
          const actualCount = cart.items
            .filter(item =>
              item.categoryIds.some(cat => allowedCats.includes(cat))
            )
            .reduce((sum, i) => sum + i.quantity, 0);

          return this.compareNumber(actualCount, cond.operator, want);
        }

        case ConditionType.CATEGORY_VALUE: {
          // 1) Valor desejado vindo do CMS
          const want = Number(value.qtyOrValue) || 0;
          // 2) IDs de categoria que ativam a condição
          const allowedCats: string[] = Array.isArray(value.categoryIds)
            ? value.categoryIds
            : [];
          // 3) Soma do valor (unitPrice * quantity) apenas dos itens cujas categories batem
          const actualValue = cart.items
            .filter(item =>
              item.categoryIds.some(catId => allowedCats.includes(catId))
            )
            .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
          // 4) Compara (EQUAL / GREATER / LESS etc)
          return this.compareNumber(actualValue, cond.operator, want);
        }

        case ConditionType.BRAND_VALUE: {
          // valor configurado no CMS
          const want = Number(value.brandValue) || 0;
          // lista de marcas permitidas
          const allowedBrands: string[] = Array.isArray(value.brandNames)
            ? value.brandNames
            : [];

          // soma só dos itens cuja marca casa exatamente com alguma em allowedBrands
          const actualValue = cart.items
            .filter(item => allowedBrands.includes(item.brand))
            .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

          return this.compareNumber(actualValue, cond.operator, want);
        }

        case ConditionType.PRODUCT_ITEM_COUNT: {
          const want = Number(value.qty) || 0;
          const targetIds = Array.isArray(value.productIds) ? value.productIds : [];
          // soma as quantidades somente dos produtos configurados
          const actualCount = cart.items
            .filter(i => targetIds.includes(i.productId))
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
          // Normaliza: remove qualquer não dígito
          const userZip = (cart.cep ?? "").replace(/\D/g, "");
          const fromZip = String(value.zipFrom ?? "").replace(/\D/g, "");
          const toZip = String(value.zipTo ?? "").replace(/\D/g, "");
          // Se não for CEP válido, falha a condição
          if (!/^\d+$/.test(userZip) || !/^\d+$/.test(fromZip) || !/^\d+$/.test(toZip)) {
            return false;
          }
          const z = parseInt(userZip, 10);
          const f = parseInt(fromZip, 10);
          const t = parseInt(toZip, 10);
          switch (cond.operator) {
            case Operator.CONTAINS:     // interpretamos como “entre”
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




        // … demais condições como STATE, BRAND_VALUE etc, seguindo o mesmo padrão …

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
    return operator === Operator.EQUAL
      ? actual === expected
      : actual !== expected;
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
}