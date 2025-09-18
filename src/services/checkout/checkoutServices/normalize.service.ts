import prisma from "../../../prisma";

/**
 * Valida se o objeto é um installment_plan válido do formato esperado:
 * { installments: number, value: number }
 */
function isValidInstallmentPlan(obj: any): obj is { installments: number; value: number, juros: number } {
    if (!obj || typeof obj !== 'object') return false;
    const inst = obj.installments;
    const val = obj.value;
    const jur = obj.juros;
    if (inst === undefined || val === undefined || jur === undefined) return false;
    // aceitar strings numéricas também (ex: "3" -> 3)
    const nInst = Number(inst);
    const nVal = Number(val);
    const nJur = Number(jur);
    if (!Number.isFinite(nInst) || !Number.isFinite(nVal) || !Number.isFinite(jur)) return false;
    return true;
}

/** detecta UUID v4-like (hex-4-4-4-12) para evitar confundir id com número de parcelas */
function looksLikeUuid(s: any): boolean {
    if (typeof s !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function extractNormalizedFromRaw(paymentResult: any) {
    const raw = paymentResult.raw ?? paymentResult;

    const normalizedPixQr =
        paymentResult.pix_payload ??
        paymentResult.pix_payload_string ??
        paymentResult.pix_qr ??
        raw?.pixPayload ??
        raw?.pix_payload ??
        raw?.pixQr ??
        null;

    const normalizedPixExpiration =
        paymentResult.pix_expiration ??
        paymentResult.pixExpiration ??
        raw?.pixExpirationDate ??
        raw?.pix_expiration ??
        raw?.dueDate ??
        null;

    const normalizedPixEncodedImage = paymentResult.pix_qr_image ?? paymentResult.pixEncodedImage ?? raw?.pixQrEncodedImage ?? null;

    const normalizedBoletoUrl =
        paymentResult.boleto_url ??
        paymentResult.bankSlipUrl ??
        paymentResult.invoiceUrl ??
        raw?.bankSlipUrl ??
        raw?.invoiceUrl ??
        raw?.bankSlip ??
        null;

    const normalizedBoletoBarcode =
        paymentResult.boleto_barcode ??
        paymentResult.barcode ??
        paymentResult.line ??
        raw?.barCode ??
        raw?.line ??
        raw?.boleto_barCode ??
        null;

    return { raw, normalizedPixQr, normalizedPixExpiration, normalizedPixEncodedImage, normalizedBoletoUrl, normalizedBoletoBarcode };
}

export async function persistPaymentOnDb(params: {
    finalGrandTotal: number;
    billingType: string;
    paymentResult: any;
    normalizedFields: ReturnType<typeof extractNormalizedFromRaw>;
    orderId: string;
    customerId: string;
    originalInstallmentPlan?: any; // NOVO: o que veio do frontend (se houver)
}) {
    const { finalGrandTotal, billingType, paymentResult, normalizedFields, orderId, customerId, originalInstallmentPlan } = params;
    const { raw, normalizedPixEncodedImage, normalizedBoletoUrl, normalizedBoletoBarcode, normalizedPixExpiration } = normalizedFields;

    // ---------- Determinar installment_plan que será persistido ----------
    let installmentPlanToPersist: { installments: number; value: number, juros: number } | undefined = undefined;

    try {
        // 1) Prioridade 1: plano enviado pelo frontend (originalInstallmentPlan)
        if (originalInstallmentPlan && isValidInstallmentPlan(originalInstallmentPlan)) {
            installmentPlanToPersist = {
                installments: Number(originalInstallmentPlan.installments),
                value: Number(originalInstallmentPlan.value),
                juros: Number(originalInstallmentPlan.juros)
            };
        } else if (originalInstallmentPlan) {
            // se veio mas não validou, tentamos coerção (se possível)
            const coercedInst = Number(originalInstallmentPlan.installments ?? originalInstallmentPlan.instalments ?? NaN);
            const coercedVal = Number(originalInstallmentPlan.value ?? originalInstallmentPlan.perInstallment ?? NaN);
            const coercedJur = Number(originalInstallmentPlan.juros ?? originalInstallmentPlan.juros ?? NaN);
            if (Number.isFinite(coercedInst) && Number.isFinite(coercedVal)) {
                installmentPlanToPersist = { installments: coercedInst, value: coercedVal, juros: coercedJur };
            } else {
                // ignoramos o original mal formado, mas mantemos o gateway raw em gateway_response
                console.warn('persistPaymentOnDb: originalInstallmentPlan presente mas inválido, ignorando (persistirá gateway_response.raw).', originalInstallmentPlan);
            }
        }

        // 2) Prioridade 2: se gateway trouxe um objeto estruturado `installment_plan`
        if (!installmentPlanToPersist && paymentResult && paymentResult.installment_plan && isValidInstallmentPlan(paymentResult.installment_plan)) {
            installmentPlanToPersist = {
                installments: Number(paymentResult.installment_plan.installments),
                value: Number(paymentResult.installment_plan.value),
                juros: Number(paymentResult.installment_plan.juros)
            };
        }

        // 3) Prioridade 3: se gateway trouxe campo `installments` e `perInstallment`/`value`
        if (!installmentPlanToPersist && paymentResult) {
            const maybeInstallments = paymentResult.installments ?? paymentResult.num_installments ?? null;
            const maybePer = paymentResult.perInstallment ?? paymentResult.per_installment ?? paymentResult.installment_value ?? paymentResult.value ?? null;
            const maybeJuros = paymentResult.juros ?? paymentResult.juros ?? null;

            // se installments parece ser um UUID/string -> NÃO usar
            if (maybeInstallments != null && !looksLikeUuid(maybeInstallments)) {
                const nInst = Number(maybeInstallments);
                const nVal = Number(maybePer ?? NaN);
                const nJur = Number(maybeJuros ?? NaN);
                if (Number.isFinite(nInst) && Number.isFinite(nVal)) {
                    installmentPlanToPersist = { installments: nInst, value: nVal, juros: nJur };
                } else if (Number.isFinite(nInst) && !Number.isFinite(nVal)) {
                    // se só tem installments numérico, calculamos um valor aproximado (divide pelo total)
                    const per = Number((finalGrandTotal / nInst).toFixed(2));
                    installmentPlanToPersist = { installments: nInst, value: per, juros: nJur };
                }
            } else {
                // caso `maybeInstallments` seja um UUID (ou string não numérica),
                // registramos nos logs e ignoramos como fonte de parcelas.
                if (maybeInstallments != null) {
                    console.warn('persistPaymentOnDb: paymentResult.installments parece ser um id/uuid — ignorando como installments numérico:', maybeInstallments);
                }
            }
        }
    } catch (err) {
        console.warn('persistPaymentOnDb: erro ao normalizar installment_plan (seguindo sem plan):', err);
        installmentPlanToPersist = undefined;
    }

    // ---------- Persistência no banco ----------
    const persistedPayment = await prisma.payment.create({
        data: {
            amount: finalGrandTotal,
            method: billingType as any,
            status: (paymentResult.status ?? 'PENDING') as any,
            transaction_id: paymentResult.id ?? paymentResult.transaction_id ?? null,
            asaas_customer_id: paymentResult.customer ?? null,
            asaas_payment_id: paymentResult.id ?? null,
            description: paymentResult.description ?? null,
            // grava aqui o objeto definitivo (ou undefined)
            installment_plan: installmentPlanToPersist ?? undefined,
            pix_qr_code: normalizedFields.normalizedPixQr ?? null,
            pix_expiration: normalizedPixExpiration ? new Date(normalizedPixExpiration) : null,
            boleto_url: normalizedBoletoUrl ?? null,
            boleto_barcode: normalizedBoletoBarcode ?? null,
            gateway_response: {
                raw,
                pix_qr_image: normalizedPixEncodedImage ?? null,
                // armazenar também o originalInstallmentPlan para auditoria (não usado pelo domínio)
                originalInstallmentPlan: originalInstallmentPlan ?? null,
            } as any,
            order: { connect: { id: orderId } },
            customer: { connect: { id: customerId } },
        },
    });

    return persistedPayment;
}