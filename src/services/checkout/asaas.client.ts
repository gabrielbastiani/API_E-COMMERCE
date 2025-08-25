import axios from 'axios';

const BASE = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3';

// prefer sandbox key if present, else produção
const API_KEY = process.env.ASAAS_API_KEY_SANDBOX ?? process.env.ASAAS_API_KEY_PRODUCAO ?? process.env.ASAAS_API_KEY;
if (!API_KEY) console.warn('ASAAS API key not provided (ASAAS_API_KEY_SANDBOX / ASAAS_API_KEY_PRODUCAO)');

const client = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    // Asaas expects "access_token" header (conforme seu código anterior)
    access_token: API_KEY,
  },
});

/** util: formata Date para YYYY-MM-DD */
function formatDateYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Create customer in Asaas (used when customer.asaas_customer_id missing) */
export async function createCustomer(opts: {
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
}) {
  const payload: any = { name: opts.name };
  if (opts.email) payload.email = opts.email;
  if (opts.phone) payload.mobilePhone = opts.phone;
  if (opts.cpfCnpj) payload.cpfCnpj = opts.cpfCnpj;

  try {
    const resp = await client.post('/customers', payload);
    const data = resp.data;
    return { id: data.id, raw: data };
  } catch (err: any) {
    const data = err?.response?.data ?? err?.message ?? String(err);
    // lançar para o caller tratar (checkout.service.ts)
    throw new Error(`Asaas createCustomer failed: ${JSON.stringify(data)}`);
  }
}

/**
 * Create payment (boleto / pix / card) - returns normalized object
 * - billingType: "PIX" | "BOLETO" | "CREDIT_CARD" | "BANK_TRANS" | string
 * - dueDate: optional ISO date YYYY-MM-DD. If omitted, will be auto-set for PIX/BOLETO.
 */
export async function createPayment(opts: {
  customer_asaaS_id?: string | undefined;
  amount: number;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'BANK_TRANS' | string;
  description?: string;
  externalReference?: string;
  dueDate?: string | null;
}) {
  const { customer_asaaS_id, amount, billingType, description, externalReference } = opts;

  const payload: any = {
    value: Number(amount).toFixed(2),
    billingType,
  };

  if (description) payload.description = description;
  if (externalReference) payload.externalReference = String(externalReference);
  if (customer_asaaS_id) payload.customer = customer_asaaS_id;

  // Asaas — many accounts require dueDate for boleto/pix flows. If not provided, set sensible defaults:
  //  - BOLETO: +3 days (typical)
  //  - PIX: today (instant) — some Asaas integrations also accept a dueDate; providing improves compatibility
  if (opts.dueDate !== undefined && opts.dueDate !== null) {
    payload.dueDate = opts.dueDate;
  } else if (billingType === 'BOLETO') {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    payload.dueDate = formatDateYYYYMMDD(d);
  } else if (billingType === 'PIX') {
    // set today's date (Asaas sometimes requires dueDate not null)
    const d = new Date();
    payload.dueDate = formatDateYYYYMMDD(d);
  } else {
    // For CREDIT_CARD or others, do not set dueDate unless explicitly provided
  }

  try {
    const resp = await client.post('/payments', payload);
    const data = resp.data;

    const boletoUrl = data?.invoiceUrl ?? data?.bankSlipUrl ?? null;
    const boletoBarcode = data?.line ?? data?.barcode ?? data?.boletoBarCode ?? null;
    const pixQr = data?.pixQrCode ?? data?.qrCode ?? data?.pixPayload ?? null;
    const pixUrl = data?.pixQrCodeUrl ?? data?.pix_qr_url ?? null;
    const pixExpiration = data?.pixDueDate ?? data?.pix_expiration ?? null;
    const installments = data?.installments ?? data?.installment ?? data?.installmentCount ?? undefined;
    const desc = data?.description ?? undefined;

    return {
      id: data.id,
      checkoutUrl: data.invoiceUrl ?? data?.checkoutUrl ?? null,
      boleto_url: boletoUrl,
      boleto_barcode: boletoBarcode,
      pix_qr: pixQr,
      pix_qr_url: pixUrl,
      pix_expiration: pixExpiration,
      installments,
      description: desc,
      raw: data,
    };
  } catch (err: any) {
    const data = err?.response?.data ?? err?.message ?? String(err);
    // Throw detailed error for caller
    throw new Error(`Asaas createPayment failed: ${JSON.stringify(data)}`);
  }
}