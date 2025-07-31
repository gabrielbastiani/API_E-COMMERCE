import { ApplyPromotionsInput, PromotionService } from "./ApplyPromotionService";
import { PromotionEngineResult } from "./PromotionEngine";

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

    // 3) Só aceitamos se o desconto total realmente aumentar
    const valid = couponResult.discountTotal > baseResult.discountTotal;

    return valid
      ? { valid: true, result: couponResult }
      : { valid: false };
  }
}