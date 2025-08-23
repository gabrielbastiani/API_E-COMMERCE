// services/asaas.client.ts
import axios from 'axios';

const BASE = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3';
const API_KEY = process.env.ASAAS_API_KEY;
if (!API_KEY) console.warn('ASAAS API key not provided');

const client = axios.create({
  baseURL: BASE,
  headers: {
    'Content-Type': 'application/json',
    access_token: API_KEY,
  },
  timeout: 15000,
});

export type AsaasCreateCustomerResult = {
  id: string;
  raw: any;
};

export type AsaasPaymentResult = {
  id: string | null;
  checkoutUrl: string | null;
  boleto_url?: string | null;
  boleto_barcode?: string | null;
  pix_qr?: string | null;
  pix_qr_url?: string | null;
  pix_expiration?: string | null;
  installments?: number | null;
  description?: string | null;
  raw?: any;
};

export async function createCustomer(opts: {
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
}): Promise<AsaasCreateCustomerResult> {
  const payload: any = { name: opts.name };
  if (opts.email) payload.email = opts.email;
  if (opts.phone) payload.mobilePhone = opts.phone;
  if (opts.cpfCnpj) payload.cpfCnpj = opts.cpfCnpj;

  const resp = await client.post('/customers', payload);
  const data = resp.data;
  return { id: data.id, raw: data };
}

/**
 * Create payment in Asaas.
 * - billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' etc.
 * - customerId: Asaas customer id (e.g. "cus_xxx") if available.
 */
export async function createPayment(opts: {
  customerId?: string;
  amount: number;
  billingType: string; // 'PIX' | 'BOLETO' | 'CREDIT_CARD' ...
  description?: string;
  externalReference?: string;
  dueDate?: string | null;
}): Promise<AsaasPaymentResult> {
  const { customerId, amount, billingType, description, externalReference, dueDate } = opts;

  const payload: any = {
    value: Number(amount), // Asaas accepts number (docs show numeric)
    billingType,
  };
  if (description) payload.description = description;
  if (externalReference) payload.externalReference = String(externalReference);
  if (customerId) payload.customer = customerId;
  if (dueDate) payload.dueDate = dueDate;

  const resp = await client.post('/payments', payload);
  const data = resp.data ?? {};

  // normalize fields from Asaas response (various names across versions)
  const boletoUrl = data.invoiceUrl ?? data.bankSlipUrl ?? data.boletoUrl ?? null;
  const boletoBarcode = data.line ?? data.barcode ?? data.boleto_barcode ?? data.boletoBarCode ?? null;
  const pixQr = data.pixPayload ?? data.pixQrCode ?? data.qrCode ?? data.pixQr ?? null;
  const pixUrl = data.pixQrCodeUrl ?? data.pix_qr_url ?? null;
  const pixExpiration = data.pixDueDate ?? data.pix_expiration ?? data.dueDate ?? null;
  const installments = data.installments ?? data.installment ?? data.installmentCount ?? null;
  const desc = data.description ?? null;

  return {
    id: data.id ?? null,
    checkoutUrl: data.invoiceUrl ?? data.checkoutUrl ?? null,
    boleto_url: boletoUrl ?? null,
    boleto_barcode: boletoBarcode ?? null,
    pix_qr: pixQr ?? null,
    pix_qr_url: pixUrl ?? null,
    pix_expiration: pixExpiration ?? null,
    installments: installments ?? null,
    description: desc,
    raw: data,
  };
}