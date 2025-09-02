// src/services/checkout/asaas.client.ts
import axios from 'axios';

const BASE = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3';
const API_KEY =
  process.env.ASAAS_API_KEY_SANDBOX ??
  process.env.ASAAS_API_KEY_PRODUCAO ??
  process.env.ASAAS_API_KEY;
if (!API_KEY) console.warn('ASAAS API key not provided (ASAAS_API_KEY_SANDBOX / ASAAS_API_KEY_PRODUCAO)');

const client = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    access_token: API_KEY,
  },
});

function formatDateYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Remove tudo que não seja dígito — retorna undefined se resultar em string vazia/undefined
function onlyDigits(str?: string | null) {
  if (str === undefined || str === null) return undefined;
  const s = String(str).replace(/\D/g, '');
  return s === '' ? undefined : s;
}

/**
 * Helper de retry simples (para endpoints auxiliares que podem precisar de polling)
 */
async function retry<T>(fn: () => Promise<T | null>, tries = 3, delayMs = 300): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const out = await fn();
      if (out) return out;
    } catch {
      // ignora e tenta de novo
    }
    const wait = delayMs * (i + 1);
    await new Promise((r) => setTimeout(r, wait));
  }
  return null;
}

/**
 * Cria customer no Asaas garantindo cpfCnpj sanitizado (se fornecido)
 */
export async function createCustomer(opts: {
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
}) {
  const payload: any = { name: opts.name };
  if (opts.email) payload.email = opts.email;
  if (opts.phone) payload.mobilePhone = opts.phone;
  const cpfCnpjSan = onlyDigits(opts.cpfCnpj);
  if (cpfCnpjSan) payload.cpfCnpj = cpfCnpjSan;

  try {
    const resp = await client.post('/customers', payload);
    const data = resp.data;
    return { id: data.id, raw: data };
  } catch (err: any) {
    const data = err?.response?.data ?? err?.message ?? String(err);
    throw new Error(`Asaas createCustomer failed: ${JSON.stringify(data)}`);
  }
}

/**
 * Recupera customer do Asaas por id
 */
export async function getCustomer(asaasCustomerId: string) {
  if (!asaasCustomerId) return null;
  try {
    const resp = await client.get(`/customers/${asaasCustomerId}`);
    return resp.data ?? null;
  } catch (err) {
    // retorna null em caso de erro (upstream decide o que fazer)
    return null;
  }
}

/**
 * Atualiza customer no Asaas (ex.: para postar cpfCnpj)
 */
export async function updateCustomer(asaasCustomerId: string, payload: { name?: string; cpfCnpj?: string; mobilePhone?: string; email?: string }) {
  if (!asaasCustomerId) throw new Error('asaasCustomerId obrigatório para updateCustomer');
  const body: any = {};
  if (payload.name) body.name = payload.name;
  if (payload.email) body.email = payload.email;
  if (payload.mobilePhone) body.mobilePhone = payload.mobilePhone;
  if (payload.cpfCnpj) body.cpfCnpj = onlyDigits(payload.cpfCnpj);

  try {
    const resp = await client.put(`/customers/${asaasCustomerId}`, body);
    return resp.data ?? null;
  } catch (err: any) {
    const data = err?.response?.data ?? err?.message ?? String(err);
    throw new Error(`Asaas updateCustomer failed: ${JSON.stringify(data)}`);
  }
}

/**
 * Tokeniza cartão
 */
export async function tokenizeCard(opts: {
  customerAsaasId?: string | undefined;
  cardNumber: string;
  holderName: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
}) {
  try {
    const payload: any = {
      creditCard: {
        holderName: opts.holderName,
        number: opts.cardNumber,
        expiryMonth: opts.expirationMonth,
        expiryYear: opts.expirationYear,
        ccv: opts.cvv,
      },
      customer: opts.customerAsaasId,
    };

    const resp = await client.post('/creditCard/tokenize', payload);
    return resp.data;
  } catch (err: any) {
    const data = err?.response?.data ?? err?.message ?? String(err);
    throw new Error(`Asaas tokenizeCard failed: ${JSON.stringify(data)}`);
  }
}

/**
 * Busca detalhes do PIX (QR Code) usando o endpoint /payments/{id}/pixQrCode
 * Retorno esperado (conforme docs): { encodedImage, payload, expirationDate } (nomes podem variar por version)
 */
async function fetchPixQrDetails(paymentId: string) {
  try {
    const resp = await client.get(`/payments/${paymentId}/pixQrCode`);
    const d = resp.data ?? null;
    if (!d) return null;

    const encodedImage = d.encodedImage ?? d.encoded_image ?? d.image ?? d.base64 ?? null;
    const payload = d.payload ?? d.pix_payload ?? d.qr ?? d.pix ?? null;
    const expirationDate = d.expirationDate ?? d.expiration_date ?? d.expiration ?? d.expireAt ?? d.expire_at ?? null;

    return {
      encodedImage,
      payload,
      expirationDate,
      raw: d,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Busca linha digitável / código de barras do boleto:
 * Endpoint: GET /payments/{id}/identificationField
 */
async function fetchBoletoIdentificationField(paymentId: string) {
  try {
    const resp = await client.get(`/payments/${paymentId}/identificationField`);
    const d = resp.data ?? null;
    if (!d) return null;

    const identification =
      d.identificationField ?? d.identification_field ?? d.line ?? d.barCode ?? d.barcode ?? d.boleto_barCode ?? null;

    return {
      identification,
      raw: d,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Cria pagamento
 * - customer_asaaS_id: se fornecido, será enviado como `customer`
 * - billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | ...
 * - opcional: cpfCnpj (se desejar criar payment sem customer id e passar cpfCnpj diretamente no payload — compatibilidade)
 */
export async function createPayment(opts: {
  customer_asaaS_id?: string | undefined;
  amount: number;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'BANK_TRANSFER' | string;
  description?: string;
  externalReference?: string;
  dueDate?: string | null;
  creditCardToken?: string | null;
  creditCardHolderName?: string | null;
  installments?: number | null;
  cpfCnpj?: string | null; // opcional: fallback (usar apenas se NÃO houver customer_asaaS_id)
}) {
  const { customer_asaaS_id, amount, billingType, description, externalReference, creditCardToken, creditCardHolderName, installments } = opts;

  const payload: any = {
    value: Number(amount),
    billingType,
  };

  if (customer_asaaS_id) payload.customer = customer_asaaS_id;
  // fallback: se nenhum customer_asaaS_id e cpfCnpj foi passado, tentamos enviar o cpfCnpj direto (algumas versões aceitam)
  const cpfCnpjSan = onlyDigits(opts.cpfCnpj ?? undefined);
  if (!customer_asaaS_id && cpfCnpjSan) {
    // Note: nem sempre a criação de payment aceita cpfCnpj direto — preferir garantir que existe o customer com cpfCnpj.
    payload.cpfCnpj = cpfCnpjSan;
  }

  if (description) payload.description = description;
  if (externalReference) payload.externalReference = externalReference;

  // DueDate logic (ensure dueDate present for gateway; fallback sensible defaults)
  if (opts.dueDate !== undefined && opts.dueDate !== null) {
    payload.dueDate = opts.dueDate;
  } else {
    if (String(billingType).toUpperCase() === 'BOLETO') {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      payload.dueDate = formatDateYYYYMMDD(d);
    } else if (String(billingType).toUpperCase() === 'PIX') {
      payload.dueDate = formatDateYYYYMMDD(new Date());
    } else if (String(billingType).toUpperCase() === 'CREDIT_CARD' || String(billingType).toUpperCase() === 'CARD') {
      payload.dueDate = formatDateYYYYMMDD(new Date());
    }
  }

  // installments for credit card
  if (String(billingType).toUpperCase() === 'CREDIT_CARD' && installments && Number(installments) > 1) {
    payload.installmentCount = Number(installments);
    payload.installmentValue = Number((Number(amount) / Number(installments)).toFixed(2));
  }

  if (String(billingType).toUpperCase() === 'CREDIT_CARD' && creditCardToken) {
    payload.creditCardToken = creditCardToken;
  }

  if (String(billingType).toUpperCase() === 'CREDIT_CARD' && creditCardHolderName) {
    payload.creditCardHolderInfo = { name: creditCardHolderName };
  }

  try {
    const resp = await client.post('/payments', payload);
    const data = resp.data ?? {};

    // Extract common fields with many aliases
    const boletoUrl =
      data.invoiceUrl ??
      data.bankSlipUrl ??
      data.boletoUrl ??
      data.boleto_url ??
      data.bankSlip ??
      data.invoice_url ??
      null;

    const boletoBarcode =
      data.line ??
      data.barCode ??
      data.boleto_barCode ??
      data.boletoBarCode ??
      data.barcode ??
      null;

    const pixQr =
      data.pixQrCode ??
      data.pixQr ??
      data.pix_payload ??
      data.pixPayload ??
      data.qrCode ??
      data.pixUrl ??
      null;

    const pixPayload =
      data.pixPayload ??
      data.pix_payload ??
      data.pix_payload_string ??
      data.payload ??
      data.pix ??
      null;

    const pixUrl =
      data.pixQrCodeUrl ??
      data.pix_qr_url ??
      data.pixQrCodeUrl ??
      data.pix_qr_link ??
      null;

    const pixExpiration =
      data.pixExpirationDate ??
      data.pixExpiration ??
      data.pix_expiration ??
      data.dueDate ??
      data.expirationDate ??
      null;

    const installmentsResp =
      data.installments ??
      data.installmentCount ??
      data.installmentsCount ??
      data.installment ??
      null;

    const paymentId = data.id ?? data.paymentId ?? null;

    // If PIX, try to fetch more details through separate endpoint
    let pixQrDetails: any = null;
    if (String(billingType).toUpperCase() === 'PIX' && paymentId) {
      pixQrDetails = await retry(() => fetchPixQrDetails(paymentId), 3, 300);
    }

    // If BOLETO, attempt to fetch identification field if not present
    let boletoLine: any = null;
    if (String(billingType).toUpperCase() === 'BOLETO' && paymentId) {
      if (!boletoBarcode) {
        boletoLine = await retry(() => fetchBoletoIdentificationField(paymentId), 3, 300);
      }
    }

    return {
      id: data.id ?? data.paymentId ?? null,
      status: data.status ?? data.paymentStatus ?? null,
      checkoutUrl: data.checkoutUrl ?? data.invoiceUrl ?? data.checkout_url ?? null,
      boleto_url: boletoUrl,
      boleto_barcode: boletoBarcode ?? boletoLine?.identification ?? boletoLine?.identificationField ?? null,
      pix_qr: pixQr ?? null,
      pix_payload: pixPayload ?? (pixQrDetails?.payload ?? null),
      pix_qr_image: pixQrDetails?.encodedImage ?? null,
      pix_qr_url: pixUrl ?? null,
      pix_expiration: pixExpiration ?? (pixQrDetails?.expirationDate ?? null),
      installments: installmentsResp,
      description: data.description ?? null,
      raw: data,
    };
  } catch (err: any) {
    const data = err?.response?.data ?? err?.message ?? String(err);
    throw new Error(`Asaas createPayment failed: ${JSON.stringify(data)}`);
  }
}