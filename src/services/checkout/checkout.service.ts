// services/checkout/checkout.service.ts
import prisma from '../../prisma'
import * as AsaasClient from './asaas.client'
import * as MelhorEnvioClient from './melhorenvio.client'

/**
 * Tipos locais
 */
type AddressPayload = {
  recipient_name?: string
  street: string
  number?: string | null
  neighborhood?: string | null
  city: string
  state: string
  zipCode: string
  country?: string | null
  complement?: string | null
  reference?: string | null
}

type ShippingCalcInput = {
  customer_id?: string
  addressId?: string | null
  address?: AddressPayload | null // inline address for guest
  items: any[]
}

/* -------------------- Addresses -------------------- */

/**
 * Lista endereços persistidos do cliente
 */
export async function listAddresses(customerId: string) {
  return prisma.address.findMany({ where: { customer_id: customerId }, orderBy: { created_at: 'desc' } })
}

/**
 * Cria endereço persistido (usuários autenticados)
 */
export async function createAddress(customerId: string, payload: AddressPayload) {
  const data: any = {
    customer_id: customerId,
    recipient_name: payload.recipient_name ?? null,
    street: payload.street,
    city: payload.city,
    state: payload.state,
    zipCode: payload.zipCode,
    country: payload.country ?? 'Brasil',
    number: payload.number ?? null,
    neighborhood: payload.neighborhood ?? null,
    complement: payload.complement ?? null,
    reference: payload.reference ?? null,
  }

  const created = await prisma.address.create({ data })
  return created
}

/**
 * Atualiza endereço persistido (valida propriedade customer_id)
 */
export async function updateAddress(customerId: string, addressId: string, payload: Partial<AddressPayload>) {
  const address = await prisma.address.findUnique({ where: { id: addressId } })
  if (!address || address.customer_id !== customerId) throw new Error('Endereço não encontrado')

  const data: any = { ...payload }
  if (Object.prototype.hasOwnProperty.call(data, 'country')) data.country = data.country ?? 'Brasil'

  const updated = await prisma.address.update({ where: { id: addressId }, data })
  return updated
}

/**
 * Remove endereço persistido (valida propriedade customer_id)
 */
export async function deleteAddress(customerId: string, addressId: string) {
  const address = await prisma.address.findUnique({ where: { id: addressId } })
  if (!address || address.customer_id !== customerId) throw new Error('Endereço não encontrado')
  await prisma.address.delete({ where: { id: addressId } })
}

/* -------------------- Shipping (Melhor Envio) -------------------- */

/**
 * Calcula frete com MelhorEnvio (wrapper).
 * Lança erro com mensagem detalhada quando MelhorEnvio retornou erro.
 */
export async function calculateShipping(input: ShippingCalcInput) {
  // Determine destination zip
  let destZip: string | undefined = undefined
  if (input.addressId) {
    const a = await prisma.address.findUnique({ where: { id: input.addressId } })
    if (!a) throw new Error('Endereço não encontrado')
    destZip = a.zipCode
  } else if (input.address) {
    destZip = input.address.zipCode
  }

  const originZip = process.env.ORIGIN_CEP
  if (!originZip) throw new Error('Origin ZIP not configured on server')
  if (!destZip) throw new Error('Destino (addressId/address.zipCode) obrigatório para cotação')

  const products = (input.items || []).map((it: any) => ({
    name: it.name ?? 'Produto',
    quantity: it.quantity ?? 1,
    price: Math.round((it.price ?? 0) * 100) / 100,
    weight: Number(it.weight ?? 0.1),
    width: Number(it.width ?? 10),
    height: Number(it.height ?? 2),
    length: Number(it.length ?? 10),
  }))

  // Chamada ao cliente MelhorEnvio (wrapper deve ter logs próprios)
  try {
    const cotacao = await MelhorEnvioClient.quote({ from: originZip, to: destZip, products })
    const options = cotacao.map((c: any) => ({
      id: `${c.carrier ?? c.provider}-${c.service ?? c.name}`,
      provider: c.carrier ?? c.provider,
      service: c.service ?? c.name,
      price: Number(c.total ?? c.price ?? 0),
      estimated_days: c.deadline ?? c.estimated_delivery_time ?? null,
      raw: c,
    }))
    return options
  } catch (err: any) {
    // Repassa erro com detalhe (útil para debug)
    const msg = err?.response?.data ? `MelhorEnvio error: ${JSON.stringify(err.response.data)}` : (err?.message ?? 'Erro ao consultar MelhorEnvio')
    console.error('calculateShipping -> MelhorEnvio error:', err?.response?.data ?? err?.message ?? err)
    throw new Error(msg)
  }
}

/* -------------------- Payment options -------------------- */
export async function getPaymentOptions() {
  return [
    { id: 'asaas-pix', provider: 'Asaas', method: 'PIX', label: 'PIX (pagamento instantâneo)', description: 'Pague via QR Code Pix' },
    { id: 'asaas-boleto', provider: 'Asaas', method: 'BOLETO', label: 'Boleto bancário', description: 'Pague com boleto' },
    { id: 'asaas-card', provider: 'Asaas', method: 'CARD', label: 'Cartão de crédito', description: 'Cartão de crédito (tokenização requerida para checkout transparente)' },
  ]
}

/* -------------------- Helpers -------------------- */

function mapPaymentIdToBillingType(paymentId: string) {
  if (!paymentId) return 'BOLETO'
  const id = paymentId.toLowerCase()
  if (id.includes('pix')) return 'PIX'
  if (id.includes('boleto')) return 'BOLETO'
  if (id.includes('card') || id.includes('credit')) return 'CREDIT_CARD'
  return 'BOLETO'
}

/* -------------------- Place Order -------------------- */

/**
 * placeOrder:
 * - aceita shippingPrice (enviado pelo frontend) para evitar recálculo (recomendado)
 * - quando não houver shippingPrice tenta recalc com MelhorEnvio (com tratamento de erro)
 * - cria cliente (guest) se necessário
 * - cria cliente Asaas se customer.asaas_customer_id ausente
 * - cria order e orderItems em transação
 * - cria cobrança na Asaas e persiste payment
 */
export async function placeOrder(input: {
  customer_id?: string | undefined
  addressId?: string | null
  address?: AddressPayload | null
  shippingId: string
  shippingPrice?: number | null
  shippingProvider?: string | null
  shippingService?: string | null
  paymentId: string
  items: any[]
  guestCustomer?: { name?: string; email?: string; phone?: string; cpf?: string }
  customerNote?: string
  couponCode?: string | null
}) {
  const {
    customer_id,
    addressId,
    address,
    shippingId,
    shippingPrice: shippingPriceFromClient,
    shippingProvider,
    shippingService,
    paymentId,
    items,
    guestCustomer,
  } = input

  // --- Resolve / create customer ---
  let customer: any = null
  if (customer_id) {
    customer = await prisma.customer.findUnique({ where: { id: customer_id } })
    if (!customer) throw new Error('Cliente não encontrado')
  } else {
    // guest: create minimal customer record to keep orders consistent
    if (!guestCustomer || !guestCustomer.name) throw new Error('Dados do cliente visitante obrigatórios')
    customer = await prisma.customer.create({/* @ts-ignore */
      data: {
        name: guestCustomer.name,
        email: guestCustomer.email ?? `guest+${Date.now()}@example.com`,
        password: Math.random().toString(36).slice(2, 10),
        phone: guestCustomer.phone ?? '',
        cpf: guestCustomer.cpf ?? undefined,
      },
    })
  }

  // Ensure Asaas customer exists (try/catch but continue if fails)
  if (!customer.asaas_customer_id) {
    try {
      const asaasCustomer = await AsaasClient.createCustomer({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        cpfCnpj: customer.cpf ?? undefined,
      })
      if (asaasCustomer?.id) {
        await prisma.customer.update({ where: { id: customer.id }, data: { asaas_customer_id: asaasCustomer.id } })
        customer.asaas_customer_id = asaasCustomer.id
      }
    } catch (err) {
      console.warn('Não foi possível criar cliente na Asaas (continuando):', err)
      // não falha o pedido apenas por isso; registro continuará sem asaas id
    }
  }

  // --- Validate items & subtotal ---
  let subtotal = 0
  for (const it of items) {
    const product = await prisma.product.findUnique({ where: { id: it.product_id } })
    if (!product) throw new Error(`Produto ${it.product_id} não encontrado`)
    const price = typeof it.price === 'number' ? it.price : (product.price_per ?? 0)
    subtotal += price * (it.quantity ?? 1)
  }

  // --- SHIPPING: prefer price from frontend; otherwise recalc on server ---
  let shippingCost: number | undefined = typeof shippingPriceFromClient === 'number' ? shippingPriceFromClient : undefined
  let chosenShipping: any = undefined

  if (shippingCost === undefined) {
    try {
      const shippingOptions = await calculateShipping({ addressId, address, items })
      chosenShipping = shippingOptions.find((s: any) => s.id === shippingId)
      if (!chosenShipping) throw new Error('Opção de frete inválida')
      shippingCost = Number(chosenShipping.price ?? 0)
    } catch (err: any) {
      console.error('placeOrder -> Erro ao calcular frete no servidor:', err?.response?.data ?? err?.message ?? err)
      throw new Error('Não foi possível calcular o frete no servidor. ' + (err?.response?.data?.message ?? err?.message ?? ''))
    }
  }

  if (!chosenShipping) {
    chosenShipping = {
      id: shippingId,
      provider: shippingProvider ?? shippingId?.split('-')[0] ?? 'unknown',
      service: shippingService ?? shippingId?.split('-')[1] ?? 'unknown',
      price: shippingCost ?? 0,
    }
  }

  const grandTotal = subtotal + (shippingCost ?? 0)

  // --- Create order + items in transaction ---
  const createdOrder = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        total: subtotal,
        shippingCost: shippingCost ?? 0,
        grandTotal,
        shippingAddress: addressId
          ? ((await tx.address.findUnique({ where: { id: addressId } }))?.street ?? '')
          : `${address?.street ?? ''}${address?.number ? ', ' + address.number : ''} - ${address?.city ?? ''}/${address?.state ?? ''} - ${address?.zipCode ?? ''}`,
        shippingMethod: `${chosenShipping.provider ?? ''} - ${chosenShipping.service ?? ''}`,
        customer: { connect: { id: customer.id } },
      },
    })

    for (const it of items) {
      await tx.orderItem.create({
        data: {
          order_id: created.id,
          product_id: it.product_id,
          price: it.price ?? 0,
          quantity: it.quantity ?? 1,
        },
      })

      // decrement stock if possible (ignore errors)
      try {
        await tx.product.update({ where: { id: it.product_id }, data: { stock: { decrement: it.quantity ?? 0 } } })
      } catch (e) {
        // não falhar o pedido por conta de falha no decremento (ajuste conforme necessidade)
        console.warn('Falha ao decrementar estoque para', it.product_id, e)
      }
    }

    return created
  })

  // --- Create payment at Asaas ---
  const billingType = mapPaymentIdToBillingType(paymentId)

  // NOTE: adapt to your Asaas client param name. The client used in this project expects "customer_asaaS_id"
  const paymentResult = await AsaasClient.createPayment({/* @ts-ignore */
    customer_asaas_id: customer.asaas_customer_id ?? undefined,
    amount: grandTotal,
    billingType,
    description: `Pedido ${createdOrder.id}`,
    externalReference: createdOrder.id,
    dueDate: null,
  })

  // --- Persist Payment record ---
  // Map method to enum accepted by Prisma (this cast avoids TS complaints)
  const paymentPersist = await prisma.payment.create({
    data: {
      amount: grandTotal,
      method: billingType as any,
      status: 'PENDING',
      transaction_id: paymentResult.id ?? null,
      asaas_customer_id: customer.asaas_customer_id ?? null,
      asaas_payment_id: paymentResult.id ?? null,
      description: paymentResult.description ?? null,
      installment_plan: paymentResult.installments ? { installments: paymentResult.installments } : undefined,
      pix_qr_code: paymentResult.pix_qr ?? null,
      pix_expiration: paymentResult.pix_expiration ? new Date(paymentResult.pix_expiration) : null,
      boleto_url: paymentResult.boleto_url ?? null,
      boleto_barcode: paymentResult.boleto_barcode ?? null,
      gateway_response: paymentResult.raw ?? paymentResult,
      order: { connect: { id: createdOrder.id } },
      customer: { connect: { id: customer.id } },
    },
  })

  // --- Resultado para frontend ---
  return {
    success: true,
    orderId: createdOrder.id,
    paymentRedirectUrl: paymentResult.checkoutUrl ?? null,
    paymentData: {
      boleto_url: paymentResult.boleto_url ?? null,
      boleto_barcode: paymentResult.boleto_barcode ?? null,
      pix_qr: paymentResult.pix_qr ?? null,
      pix_qr_url: paymentResult.pix_qr_url ?? null,
      pix_expiration: paymentResult.pix_expiration ?? null,
    },
  }
}