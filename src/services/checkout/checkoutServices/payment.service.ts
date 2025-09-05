import * as AsaasClient from '../asaas.client';

export async function createPaymentOnGateway(params: {
    customer: any;
    card?: any | null;
    paymentId: string;
    finalGrandTotal: number;
    orderRefForGateway: string | number;
}) {
    const { customer, card, paymentId, finalGrandTotal, orderRefForGateway } = params;

    const billingType = String(paymentId ?? '').toLowerCase().includes('pix')
        ? 'PIX'
        : String(paymentId ?? '').toLowerCase().includes('boleto')
            ? 'BOLETO'
            : String(paymentId ?? '').toLowerCase().includes('card')
                ? 'CREDIT_CARD'
                : 'BOLETO';

    // retorna { billingType, paymentResult }
    let paymentResult: any;
    try {
        if (billingType === 'CREDIT_CARD' && card) {
            let tokenResp: any = null;
            try {
                tokenResp = await AsaasClient.tokenizeCard({
                    customerAsaasId: customer.asaas_customer_id ?? undefined,
                    cardNumber: card.number.replace(/\s+/g, ''),
                    holderName: card.holderName,
                    expirationMonth: String(card.expirationMonth).padStart(2, '0'),
                    expirationYear: String(card.expirationYear),
                    cvv: card.cvv,
                });
            } catch (err) {
                console.warn('Tokenização falhou:', err instanceof Error ? err.message : err);
                throw new Error('Falha na tokenização do cartão. Verifique os dados do cartão.');
            }

            const maybeToken = tokenResp?.creditCardToken || tokenResp?.token || tokenResp?.id;
            if (!maybeToken) {
                throw new Error('Token de cartão não retornado pela Asaas. Verifique resposta: ' + JSON.stringify(tokenResp));
            }

            paymentResult = await AsaasClient.createPayment({
                customer_asaaS_id: customer.asaas_customer_id ?? undefined,
                amount: finalGrandTotal,
                billingType: 'CREDIT_CARD',
                description: `Pedido ${orderRefForGateway}`,
                externalReference: String(orderRefForGateway),
                creditCardToken: maybeToken,
                creditCardHolderName: card.holderName,
                installments: card.installments ?? 1,
            });
        } else {
            paymentResult = await AsaasClient.createPayment({
                customer_asaaS_id: customer.asaas_customer_id ?? undefined,
                amount: finalGrandTotal,
                billingType: billingType as any,
                description: `Pedido ${orderRefForGateway}`,
                externalReference: String(orderRefForGateway),
            });
        }
    } catch (err: any) {
        throw err;
    }

    return { billingType, paymentResult };
}