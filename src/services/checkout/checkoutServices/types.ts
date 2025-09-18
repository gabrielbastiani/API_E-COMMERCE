export type AddressPayload = {
    recipient_name?: string;
    street: string;
    number?: string | null;
    neighborhood?: string | null;
    city: string;
    state: string;
    zipCode: string;
    country?: string | null;
    complement?: string | null;
    reference?: string | null;
};

export type InstallmentPlan = {
    installments: number;
    value: number;
};

export type CardPayload = {
    // Valor por parcela enviado pelo frontend (se existir)
    installment_value?: number | null;
    // Número do cartão (NUNCA persista o PAN/CVV)
    number: string;
    holderName: string;
    expirationMonth: string | number;
    expirationYear: string | number;
    cvv: string;
    // número de parcelas (forma padrão)
    installments?: number | null;
    brand?: string | null;

    // Campos opcionais adicionais que seu backend/fluxo aceita:
    // objeto explícito com { installments, value } enviado pelo frontend
    installment_plan?: InstallmentPlan | null;
    // alias camelCase
    installmentPlan?: InstallmentPlan | null;

    // alias alternativos que podem aparecer (compatibilidade):
    installment?: number | null;
    qtdParcelas?: number | null;
};

export type PlaceOrderInput = {
    cartId?: string | null;
    customer_id?: string | undefined;
    addressId?: string | null;
    address?: AddressPayload | null;
    shippingId: string;
    paymentId: string;
    items: Array<{ product_id: string; price?: number; quantity?: number; weight?: number; length?: number; height?: number; width?: number; variant_id?: string | null; }>;
    guestCustomer?: { name?: string; email?: string; phone?: string; cpf?: string; cnpj?: string };
    customerNote?: string;
    shippingCost?: number | null;
    shippingRaw?: any | null;
    couponCode?: string | null;
    card?: CardPayload | null;
    orderTotalOverride?: number | null;
    promotion_id?: any;
    promotionDetails?: any;
};