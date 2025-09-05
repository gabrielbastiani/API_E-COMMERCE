import {
  PrismaClient,
  PromotionCondition,
  ActionType,
  ConditionType,
  Operator,
  StatusPromotion,
} from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

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

interface CartItem {
  variantId?: string | null;
  productId: string;
  quantity: number;
  unitPrice: number;
  categoryIds?: string[];
  brand?: string;
}

interface CartContext {
  items: CartItem[];
  userId?: string;
  isFirstPurchase?: boolean;
  cep?: string;
  subtotal: number;
  shipping: number;
  total: number;
}

export class PromotionEngine {
  static async applyPromotions(
    cart: CartContext,
    couponCode?: string
  ): Promise<PromotionEngineResult> {
    // 1) resolve estado do usuário pelo CEP (se houver)
    let userState: string | null = null;
    if (cart.cep) {
      const cepDigits = cart.cep.replace(/\D/g, "");
      try {
        const resp = await axios.get(`https://viacep.com.br/ws/${cepDigits}/json/`);
        if (!resp.data.erro && resp.data.uf) {
          userState = resp.data.uf;
        }
      } catch (err) {
        console.log("[PromotionEngine] erro ao buscar CEP:", err);
      }
    }

    // 2) busca todas promoções ativas
    const allPromos = await prisma.promotion.findMany({
      where: {
        status: {
          in: [StatusPromotion.Disponivel, StatusPromotion.Disponivel_programado],
        },
      },
      include: {
        conditions: true,
        actions: true,
        coupons: true,
        badges: true,
        variantPromotions: true,
        displays: true,
      },
      orderBy: { priority: "desc" },
    });

    // 3) separar automáticas e as que requerem cupom
    const autoPromos = allPromos.filter((p) => !p.hasCoupon);
    const normalizedCoupon = couponCode ? couponCode.trim().toLowerCase() : null;

    const couponPromos = normalizedCoupon
      ? allPromos.filter((p) => {
          const matched =
            p.hasCoupon &&
            Array.isArray(p.coupons) &&
            p.coupons.some(
              (c) => (String(c.code ?? "").trim().toLowerCase() === normalizedCoupon)
            );
          if (matched) {
            console.log(
              `[PromotionEngine] coupon "${normalizedCoupon}" matched promo ${p.id} (name=${p.name})`
            );
          }
          return matched;
        })
      : [];

    // 4) se não aceitar múltiplos, pega só a de maior prioridade
    let selectedCouponPromos: typeof allPromos = [];
    if (couponPromos.length) {
      couponPromos.sort((a, b) => b.priority - a.priority);
      if (!couponPromos[0].multipleCoupons) {
        selectedCouponPromos = [couponPromos[0]];
      } else {
        selectedCouponPromos = couponPromos;
      }
    }

    // 5) concatenar e reordenar por prioridade
    const toApply = [...autoPromos, ...selectedCouponPromos].sort(
      (a, b) => b.priority - a.priority
    );

    let productDiscount = 0;
    let shippingDiscount = 0;
    const freeGifts: Array<{
      productId?: string;
      variantId?: string;
      sku?: string;
      quantity: number;
      isVariant: boolean;
      name?: string;
      unitPrice?: number | null;
    }> = [];
    const badgeMap: Record<string, { title: string; imageUrl: string }> = {};
    const descriptions: string[] = [];
    const promotions: PromotionDetail[] = [];

    // Helper para rastrear meta de exibição
    type PromoMetaKind = "none" | "percent" | "currency" | "mixed";

    for (const promo of toApply) {
      // avaliar condições
      if (!this.evaluateConditions(promo.conditions, cart, userState)) {
        continue;
      }

      const beforeProduct = productDiscount;
      const beforeShipping = shippingDiscount;

      descriptions.push(promo.description ?? "");

      const promoMeta: { kind: PromoMetaKind; percent?: number; amount: number } = {
        kind: "none",
        percent: undefined,
        amount: 0,
      };

      function addProductDiscount(value: number, kind: "currency" | "percent", pct?: number) {
        productDiscount += value;
        promoMeta.amount += value;
        if (kind === "percent") {
          if (promoMeta.kind === "none") {
            promoMeta.kind = "percent";
            promoMeta.percent = pct;
          } else if (promoMeta.kind === "percent" && promoMeta.percent !== pct) {
            promoMeta.kind = "mixed";
          } else if (promoMeta.kind === "currency") {
            promoMeta.kind = "mixed";
          }
        } else {
          if (promoMeta.kind === "none") promoMeta.kind = "currency";
          else if (promoMeta.kind === "percent") promoMeta.kind = "mixed";
        }
      }

      function addShippingDiscount(value: number, kind: "currency" | "percent", pct?: number) {
        shippingDiscount += value;
        promoMeta.amount += value;
        if (kind === "percent") {
          if (promoMeta.kind === "none") {
            promoMeta.kind = "percent";
            promoMeta.percent = pct;
          } else if (promoMeta.kind === "percent" && promoMeta.percent !== pct) {
            promoMeta.kind = "mixed";
          } else if (promoMeta.kind === "currency") {
            promoMeta.kind = "mixed";
          }
        } else {
          if (promoMeta.kind === "none") promoMeta.kind = "currency";
          else if (promoMeta.kind === "percent") promoMeta.kind = "mixed";
        }
      }

      // aplicar ações
      for (const act of promo.actions) {
        const p = act.params as any;
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

      // aplicar badges
      for (const badge of promo.badges) {
        if (promo.variantPromotions && promo.variantPromotions.length) {
          promo.variantPromotions.forEach((v: any) => {
            badgeMap[v.id] = { title: badge.title, imageUrl: badge.imageUrl };
          });
        } else {
          cart.items.forEach((i) => {
            badgeMap[i.variantId ?? i.productId] = { title: badge.title, imageUrl: badge.imageUrl };
          });
        }
      }

      const deltaProduct = Number((productDiscount - beforeProduct).toFixed(2));
      const deltaShipping = Number((shippingDiscount - beforeShipping).toFixed(2));
      const delta = Number((deltaProduct + deltaShipping).toFixed(2));

      let type: "product" | "shipping" | "mixed" = "mixed";
      if (deltaProduct > 0 && deltaShipping === 0) type = "product";
      else if (deltaShipping > 0 && deltaProduct === 0) type = "shipping";
      else type = "mixed";

      let display: PromotionDetail["display"] = undefined;

      if (promoMeta.kind === "percent") {
        display = { kind: "percent", percent: promoMeta.percent ?? 0, amount: Number(delta.toFixed(2)) };
      } else if (promoMeta.kind === "currency" || promoMeta.kind === "mixed") {
        display = { kind: "currency", amount: Number(delta.toFixed(2)) };
      } else {
        display = { kind: "none" };
      }

      promotions.push({
        id: promo.id,
        name: promo.name,
        description: promo.description ?? "",
        discount: delta,
        type,
        display,
      });

      if (!promo.cumulative) {
        break;
      }
    } // fim for promos

    const discountTotal = Number((productDiscount + shippingDiscount).toFixed(2));
    return {
      discountTotal,
      productDiscount: Number(productDiscount.toFixed(2)),
      shippingDiscount: Number(shippingDiscount.toFixed(2)),
      freeGifts,
      badgeMap,
      descriptions,
      promotions,
    };
  }

  private static evaluateConditions(
    conditions: PromotionCondition[],
    cart: CartContext,
    userState: string | null
  ): boolean {
    // percorre condições uma-a-uma para poder logar qual falhou
    for (const cond of conditions) {
      const value = cond.value as Record<string, any>;
      let ok = true;

      try {
        switch (cond.type) {
          case ConditionType.STATE:
            if (!userState) {
              ok = false;
              break;
            }
            const states: string[] = Array.isArray(value.states) ? value.states : [];
            ok = cond.operator === Operator.NOT_EQUAL ? !states.includes(userState) : states.includes(userState);
            break;

          case ConditionType.FIRST_ORDER:
            ok = this.compareBoolean(Boolean(cart.isFirstPurchase), cond.operator, Boolean(value.firstOrder));
            break;

          case ConditionType.CART_ITEM_COUNT: {
            const totalQty = cart.items.reduce((sum, i) => sum + i.quantity, 0);
            ok = this.compareNumber(totalQty, cond.operator, Number(value.qty) || 0);
            break;
          }

          case ConditionType.CATEGORY: {
            // value.categoryIds expected
            const allowedCats: string[] = Array.isArray(value.categoryIds) ? value.categoryIds : [];
            // collect all category ids present in cart
            const presentCatsSet = new Set<string>();
            for (const it of cart.items) {
              const list = Array.isArray(it.categoryIds) ? it.categoryIds : [];
              for (const c of list) presentCatsSet.add(c);
            }
            const presentCats = Array.from(presentCatsSet);
            // helper tests
            const anyMatch = allowedCats.length > 0 && cart.items.some(it => (it.categoryIds || []).some((c) => allowedCats.includes(c)));
            const allItemsInAllowed = allowedCats.length > 0 && cart.items.every(it => (it.categoryIds || []).some((c) => allowedCats.includes(c)));
            switch (cond.operator) {
              case Operator.CONTAINS:
                ok = anyMatch;
                break;
              case Operator.NOT_CONTAINS:
                ok = !anyMatch;
                break;
              case Operator.EQUAL:
              case Operator.EVERY:
                // EQUAL / EVERY: exige que todos os itens do carrinho pertençam (pelo menos) a allowedCats
                ok = cart.items.length > 0 ? allItemsInAllowed : false;
                break;
              case Operator.NOT_EQUAL:
                ok = !(cart.items.length > 0 ? allItemsInAllowed : false);
                break;
              default:
                ok = false;
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
            ok = this.compareNumber(actualCount, cond.operator, want);
            break;
          }

          case ConditionType.CATEGORY_VALUE: {
            const want = Number(value.qtyOrValue) || 0;
            const allowedCats3: string[] = Array.isArray(value.categoryIds) ? value.categoryIds : [];
            const actualValue = cart.items
              .filter((item) => item.categoryIds && item.categoryIds.some((c) => allowedCats3.includes(c)))
              .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
            ok = this.compareNumber(actualValue, cond.operator, want);
            break;
          }

          case ConditionType.BRAND_VALUE: {
            const want = Number(value.brandValue) || 0;
            const allowedBrands: string[] = Array.isArray(value.brandNames) ? value.brandNames : [];
            const actualValue = cart.items
              .filter((item) => allowedBrands.includes(item.brand ?? ""))
              .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
            ok = this.compareNumber(actualValue, cond.operator, want);
            break;
          }

          case ConditionType.PRODUCT_ITEM_COUNT: {
            const want = Number(value.qty) || 0;
            const targets: string[] = Array.isArray(value.productIds) ? value.productIds : [];
            const actualCount = cart.items
              .filter((i) => targets.includes(i.productId))
              .reduce((sum, i) => sum + i.quantity, 0);
            ok = this.compareNumber(actualCount, cond.operator, want);
            break;
          }

          case ConditionType.UNIQUE_VARIANT_COUNT: {
            const variants = Array.isArray(value.variantIds) ? value.variantIds : [];
            const uniqCount = new Set(
              variants.length > 0
                ? cart.items.filter((i) => variants.includes(i.variantId ?? "")).map((i) => i.variantId)
                : cart.items.map((i) => i.variantId)
            ).size;
            ok = this.compareNumber(uniqCount, cond.operator, Number(value.qty) || 0);
            break;
          }

          case ConditionType.PRODUCT_CODE: {
            const expected: string[] = Array.isArray(value.productIds) ? value.productIds : [];
            const matchAll = value.matchAll === true;
            ok = this.compareArray(cart.items.map((i) => i.productId), cond.operator, expected, matchAll);
            break;
          }

          case ConditionType.VARIANT_CODE: {
            const expected: string[] = Array.isArray(value.variantIds) ? value.variantIds : [];
            const matchAll = value.matchAll === true;
            ok = this.compareArray(cart.items.map((i) => i.variantId ?? ""), cond.operator, expected, matchAll);
            break;
          }

          case ConditionType.ZIP_CODE: {
            const userZip = (cart.cep ?? "").replace(/\D/g, "");
            const fromZip = String(value.zipFrom ?? "").replace(/\D/g, "");
            const toZip = String(value.zipTo ?? "").replace(/\D/g, "");
            if (!userZip || !fromZip || !toZip) {
              ok = false;
              break;
            }
            const z = +userZip, f = +fromZip, t = +toZip;
            switch (cond.operator) {
              case Operator.CONTAINS:
                ok = z >= f && z <= t;
                break;
              case Operator.NOT_CONTAINS:
                ok = z < f || z > t;
                break;
              case Operator.EQUAL:
                ok = z === f;
                break;
              case Operator.NOT_EQUAL:
                ok = z !== f;
                break;
              default:
                ok = false;
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

  private static compareNumber(actual: number, operator: Operator, expected: number): boolean {
    switch (operator) {
      case Operator.EQUAL: return actual === expected;
      case Operator.NOT_EQUAL: return actual !== expected;
      case Operator.GREATER: return actual > expected;
      case Operator.GREATER_EQUAL: return actual >= expected;
      case Operator.LESS: return actual < expected;
      case Operator.LESS_EQUAL: return actual <= expected;
    }
    return false;
  }

  private static compareBoolean(actual: boolean, operator: Operator, expected: boolean): boolean {
    return operator === Operator.EQUAL ? actual === expected : actual !== expected;
  }

  private static compareArray(actual: string[], operator: Operator, expected: string[], matchAll = false): boolean {
    const a = Array.isArray(actual) ? actual.filter(Boolean) : [];
    const e = Array.isArray(expected) ? expected.filter(Boolean) : [];

    switch (operator) {
      case Operator.CONTAINS:
        if (e.length === 0) return false;
        return matchAll ? e.every((v) => a.includes(v)) : e.some((v) => a.includes(v));
      case Operator.NOT_CONTAINS:
        if (e.length === 0) return true;
        return e.every((v) => !a.includes(v));
      case Operator.EQUAL:
        return a.length === e.length && e.every((v) => a.includes(v));
      case Operator.NOT_EQUAL:
        return !(a.length === e.length && e.every((v) => a.includes(v)));
    }
    return false;
  }
}