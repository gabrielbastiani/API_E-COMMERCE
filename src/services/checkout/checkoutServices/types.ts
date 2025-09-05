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


export type CardPayload = {
    number: string;
    holderName: string;
    expirationMonth: string | number;
    expirationYear: string | number;
    cvv: string;
    installments?: number | null;
    brand?: string | null;
};


export type PlaceOrderInput = {
    cartId?: string | null;
    customer_id?: string | undefined;
    addressId?: string | null;
    address?: AddressPayload | null;
    shippingId: string;
    paymentId: string;
    items: Array<{
        product_id: string;
        price?: number;
        quantity?: number;
        weight?: number;
        length?: number;
        height?: number;
        width?: number;
        variant_id?: string | null;
    }>;
    guestCustomer?: { name?: string; email?: string; phone?: string; cpf?: string; cnpj?: string };
    customerNote?: string;
    shippingCost?: number | null;
    shippingRaw?: any | null;
    couponCode?: string | null;
    card?: CardPayload | null;
    orderTotalOverride?: number | null;
};