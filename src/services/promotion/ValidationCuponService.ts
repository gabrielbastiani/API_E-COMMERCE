import { ApplyPromotionsInput, PromotionService } from "./ApplyPromotionService";
import { PromotionEngineResult } from "./promotionEngine/types";

interface ValidationRequest
  extends Omit<ApplyPromotionsInput, "descriptions" | "couponCode"> {
  coupon: string;
}

export class ValidationCouponService {
  async execute(
    input: ValidationRequest
  ): Promise<{ valid: boolean; result?: PromotionEngineResult }> {
    const { coupon, ...cartCtx } = input;

    // 1) Executa SEM cupom (só automáticas)
    const baseResult = await PromotionService.applyPromotions({
      ...cartCtx,
      couponCode: null,
      descriptions: [],
    });

    // 2) Executa COM cupom
    const couponResult = await PromotionService.applyPromotions({
      ...cartCtx,
      couponCode: coupon,
      descriptions: [],
    });

    // 3) Aceitar o cupom se:
    //    - aumentar o desconto total, OU
    //    - adicionar brindes (freeGifts), OU
    //    - adicionar pelo menos 1 promoção nova (por id)
    const increasedDiscount = couponResult.discountTotal > baseResult.discountTotal;

    const freeGiftsAdded =
      (couponResult.freeGifts?.length ?? 0) > (baseResult.freeGifts?.length ?? 0);

    const basePromoIds = new Set((baseResult.promotions ?? []).map((p) => p.id));
    const newPromotionAdded = (couponResult.promotions ?? []).some((p) => !basePromoIds.has(p.id));

    const valid = increasedDiscount || freeGiftsAdded || newPromotionAdded;

    return valid
      ? { valid: true, result: couponResult }
      : { valid: false };
  }
}