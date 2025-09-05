import prisma from "../../../prisma";

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
}) {
    const { finalGrandTotal, billingType, paymentResult, normalizedFields, orderId, customerId } = params;
    const { raw, normalizedPixEncodedImage, normalizedBoletoUrl, normalizedBoletoBarcode, normalizedPixExpiration } = normalizedFields;

    const persistedPayment = await prisma.payment.create({
        data: {
            amount: finalGrandTotal,
            method: billingType as any,
            status: (paymentResult.status ?? 'PENDING') as any,
            transaction_id: paymentResult.id ?? null,
            asaas_customer_id: null,
            asaas_payment_id: paymentResult.id ?? null,
            description: paymentResult.description ?? null,
            installment_plan: paymentResult.installments ? { installments: paymentResult.installments } : undefined,
            pix_qr_code: normalizedFields.normalizedPixQr ?? null,
            pix_expiration: normalizedPixExpiration ? new Date(normalizedPixExpiration) : null,
            boleto_url: normalizedBoletoUrl ?? null,
            boleto_barcode: normalizedBoletoBarcode ?? null,
            gateway_response: {
                raw,
                pix_qr_image: normalizedPixEncodedImage ?? null,
            } as any,
            order: { connect: { id: orderId } },
            customer: { connect: { id: customerId } },
        },
    });

    return persistedPayment;
}