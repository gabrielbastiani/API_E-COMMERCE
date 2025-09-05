import {
  PromotionCondition,
  StatusPromotion,
} from "@prisma/client";
import { CartContext, PromoMetaKind, PromotionDetail, PromotionEngineResult } from "./promotionEngine/types";
import { getStateFromCep } from "./promotionEngine/cepService";
import prisma from "./promotionEngine/db";
import { evaluateConditions } from "./promotionEngine/evaluateConditions";
import { applyActionsToPromo } from "./promotionEngine/applyActions";

export class PromotionEngine {
  static async applyPromotions(
    cart: CartContext,
    couponCode?: string
  ): Promise<PromotionEngineResult> {
    // 1) resolve estado do usuário pelo CEP (se houver)
    let userState: string | null = null;
    if (cart.cep) {
      userState = await getStateFromCep(cart.cep);
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

    for (const promo of toApply) {
      // avaliar condições
      if (!evaluateConditions(promo.conditions as PromotionCondition[], cart, userState)) {
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

      // aplicar ações (usa applyActionsToPromo)
      await applyActionsToPromo(promo, cart, freeGifts, addProductDiscount, addShippingDiscount);

      // aplicar badges
      for (const badge of promo.badges || []) {
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
}