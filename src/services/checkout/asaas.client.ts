import axios from 'axios'

const BASE = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3'
const API_KEY = process.env.ASAAS_API_KEY
if (!API_KEY) console.warn('ASAAS API key not provided')

const client = axios.create({
  baseURL: BASE,
  headers: {
    'Content-Type': 'application/json',
    'access_token': API_KEY,
  },
})

// Create customer in Asaas (used when customer.asaas_customer_id missing)
export async function createCustomer(opts: {
  name: string
  email?: string
  phone?: string
  cpfCnpj?: string
}) {
  const payload: any = {
    name: opts.name,
  }
  if (opts.email) payload.email = opts.email
  if (opts.phone) payload.mobilePhone = opts.phone
  if (opts.cpfCnpj) payload.cpfCnpj = opts.cpfCnpj

  const resp = await client.post('/customers', payload)
  const data = resp.data
  return {
    id: data.id,
    raw: data,
  }
}

// Create payment (boleto / pix / card) - returns normalized object
export async function createPayment(opts: {
  customer_asaaS_id?: string | undefined
  amount: number
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'BANK_TRANS' | string
  description?: string
  externalReference?: string
  dueDate?: string | null
}) {
  const { customer_asaaS_id, amount, billingType, description, externalReference, dueDate } = opts

  const payload: any = {
    value: Number(amount).toFixed(2),
    billingType,
    description: description ?? undefined,
    externalReference: externalReference ?? undefined,
  }

  if (customer_asaaS_id) payload.customer = customer_asaaS_id
  if (dueDate) payload.dueDate = dueDate

  const resp = await client.post('/payments', payload)
  const data = resp.data

  // Try to normalize common fields for boleto/pix flows
  const boletoUrl = data?.invoiceUrl ?? data?.bankSlipUrl ?? data?.bankSlipUrl ?? null
  const boletoBarcode = data?.line ?? data?.barcode ?? data?.boletoBarCode ?? null
  const pixQr = data?.pixQrCode ?? data?.qrCode ?? data?.pixPayload ?? null
  const pixUrl = data?.pixQrCodeUrl ?? data?.pix_qr_url ?? null
  const pixExpiration = data?.pixDueDate ?? data?.pix_expiration ?? null

  // installments and description may be present on the payload depending on the account type / gateway
  const installments = data?.installments ?? data?.installment ?? data?.installmentCount ?? undefined
  const desc = data?.description ?? undefined

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
  }
}
