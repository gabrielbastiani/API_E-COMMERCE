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
  ): Promise<PromotionEngineResult & { skippedPromotions?: Array<{ id: string; reason: string }> }> {
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
            // opcional: log
            // console.log(`[PromotionEngine] coupon "${normalizedCoupon}" matched promo ${p.id} (name=${p.name})`);
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

    // 5) concatenar e reordenar por prioridade (candidatas iniciais)
    let toApply = [...autoPromos, ...selectedCouponPromos].sort(
      (a, b) => b.priority - a.priority
    );

    // --- NOVO: pré-filtragem por usos do usuário e totalCouponCount ---
    // criamos uma lista de promoIds para consultar usageCounts
    const skippedPromotions: Array<{ id: string; reason: string }> = [];

    const promoIds = toApply.map((p) => p.id);

    // se tivermos um usuário autenticado, vamos buscar quantos usos ele tem por promotion
    const usageByPromotion: Record<string, number> = {};
    if (cart.userId) {
      try {
        // groupBy retorna { promotion_id, _count: { _all: n } }
        const usages = await prisma.promotionUsage.groupBy({
          by: ["promotion_id"],
          where: {
            promotion_id: { in: promoIds },
            customer_id: cart.userId,
          },
          _count: {
            _all: true,
          },
        });
        for (const u of usages) {
          // @ts-ignore (estrutura do result)
          usageByPromotion[u.promotion_id] = u._count?._all ?? 0;
        }
      } catch (err) {
        // se o groupBy não estiver disponível em sua versão do prisma,
        // podemos cair para um fallback com findMany + reduce (não implementei aqui,
        // mas posso ajustar se você me informar a versão).
        // console.warn('PromotionEngine: groupBy usage failed', err);
      }
    }

    // buscar totalCouponCount e perUserCouponLimit dos promos (já temos em allPromos, mas filtramos com base em ids)
    const promoMetaMap = new Map<string, { perUserCouponLimit?: number | null; totalCouponCount?: number | null; name?: string }>();
    for (const p of toApply) {
      promoMetaMap.set(p.id, { perUserCouponLimit: (p as any).perUserCouponLimit, totalCouponCount: (p as any).totalCouponCount, name: p.name });
    }

    // Agora percorremos toApply e removemos promos que o usuário já não pode usar
    const finalCandidates: typeof toApply = [];
    for (const p of toApply) {
      const meta = promoMetaMap.get(p.id);
      const title = p.name ?? p.id;

      // 1) se totalCouponCount definido e <= 0 -> pular (esgotada)
      if (typeof meta?.totalCouponCount === "number" && meta.totalCouponCount <= 0) {
        skippedPromotions.push({ id: p.id, reason: `Promoção "${title}" esgotada (total de cupons).` });
        continue;
      }

      // 2) se temos usuário e perUserCouponLimit definido -> checar usos do usuário
      if (cart.userId && typeof meta?.perUserCouponLimit === "number") {
        const usedByUser = usageByPromotion[p.id] ?? 0;
        if (usedByUser >= (meta.perUserCouponLimit ?? 0)) {
          skippedPromotions.push({ id: p.id, reason: `Você já usou esta promoção ${usedByUser}x e o limite por usuário é ${meta.perUserCouponLimit}.` });
          continue;
        }
      }

      // se passou nas checagens -> considera candidato
      finalCandidates.push(p);
    }

    // substituir toApply pelos candidatos filtrados
    toApply = finalCandidates;

    // ------------ lógica existente: avaliar condições e aplicar ações ------------
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
        // Se a condição não bate, apenas continue — sem marcar skipped (pois não é "uso anterior" nem esgotada)
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
    // devolve também skippedPromotions para que frontend possa exibir motivos (opcional)
    return {
      discountTotal,
      productDiscount: Number(productDiscount.toFixed(2)),
      shippingDiscount: Number(shippingDiscount.toFixed(2)),
      freeGifts,
      badgeMap,
      descriptions,
      promotions,
      skippedPromotions,
    };
  }
}