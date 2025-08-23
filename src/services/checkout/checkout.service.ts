import prisma from '../../prisma'
import * as AsaasClient from './asaas.client'
import * as MelhorEnvioClient from './melhorenvio.client'

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

// -------------------- Addresses --------------------
export async function listAddresses(customerId: string) {
  return prisma.address.findMany({ where: { customer_id: customerId }, orderBy: { created_at: 'desc' } })
}

// Create persistent address for authenticated user
export async function createAddress(customerId: string, payload: AddressPayload) {
  // Prisma model Address requires 'country' non-nullable
  const data: any = {
    customer_id: customerId,
    recipient_name: payload.recipient_name,
    street: payload.street,
    city: payload.city,
    state: payload.state,
    zipCode: payload.zipCode,
    country: payload.country ?? 'BR',
    number: payload.number ?? null,
    neighborhood: payload.neighborhood ?? null,
    complement: payload.complement ?? null,
    reference: payload.reference ?? null,
  }

  const created = await prisma.address.create({ data })
  return created
}

export async function updateAddress(customerId: string, addressId: string, payload: Partial<AddressPayload>) {
  const address = await prisma.address.findUnique({ where: { id: addressId } })
  if (!address || address.customer_id !== customerId) throw new Error('Endereço não encontrado')
  // Ensure country not undefined when updating required field if provided empty
  const data: any = {
    ...payload,
  }
  if (Object.prototype.hasOwnProperty.call(data, 'country')) data.country = data.country ?? 'BR'
  const updated = await prisma.address.update({ where: { id: addressId }, data })
  return updated
}

export async function deleteAddress(customerId: string, addressId: string) {
  const address = await prisma.address.findUnique({ where: { id: addressId } })
  if (!address || address.customer_id !== customerId) throw new Error('Endereço não encontrado')
  await prisma.address.delete({ where: { id: addressId } })
}

// -------------------- Shipping --------------------
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

  const originZip = process.env.MELHOR_ENVIO_ORIGIN_ZIP
  if (!originZip) throw new Error('Origin ZIP not configured on server')
  if (!destZip) throw new Error('Destino (addressId/address.zipCode) obrigatório para cotação')

  const products = (input.items || []).map((it: any) => ({
    name: it.name ?? 'Produto',
    quantity: it.quantity ?? 1,
    price: Math.round((it.price ?? 0) * 100) / 100,
    weight: (it.weight ?? 0.1),
    width: it.width ?? 10,
    height: it.height ?? 2,
    length: it.length ?? 10,
  }))

  const cotacao = await MelhorEnvioClient.quote({ from: originZip, to: destZip, products })

  const options = cotacao.map((c: any) => ({
    id: `${c.carrier}-${c.service}`,
    provider: c.carrier,
    service: c.service,
    price: c.total,
    estimated_days: c.deadline ?? null,
    raw: c,
  }))

  return options
}

// -------------------- Payment options --------------------
export async function getPaymentOptions() {
  return [
    { id: 'asaas-pix', provider: 'Asaas', method: 'PIX', label: 'PIX (pagamento instantâneo)', description: 'Pague via QR Code Pix' },
    { id: 'asaas-boleto', provider: 'Asaas', method: 'BOLETO', label: 'Boleto bancário', description: 'Pague com boleto' },
    { id: 'asaas-card', provider: 'Asaas', method: 'CARD', label: 'Cartão de crédito', description: 'Pague com cartão de crédito (via tokenização)' },
  ]
}

// -------------------- Place Order --------------------
export async function placeOrder(input: {
  customer_id?: string | undefined
  addressId?: string | null
  address?: AddressPayload | null
  shippingId: string
  paymentId: string
  items: any[]
  guestCustomer?: { name?: string; email?: string; phone?: string; cpf?: string }
  customerNote?: string
}) {
  const { customer_id, addressId, address, shippingId, paymentId, items, guestCustomer } = input

  // If customer_id absent, create or use a guest customer
  let customer: any = null
  if (customer_id) {
    customer = await prisma.customer.findUnique({ where: { id: customer_id } })
    if (!customer) throw new Error('Cliente não encontrado')
  } else {
    // Guest flow: create a customer record (recommended) to keep history and support Asaas
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

  // Ensure asaas_customer_id exists: create in Asaas if missing
  if (!customer.asaas_customer_id) {
    try {
      const asaasCustomer = await AsaasClient.createCustomer({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        cpfCnpj: customer.cpf ?? undefined,
      })
      // persist in DB
      await prisma.customer.update({ where: { id: customer.id }, data: { asaas_customer_id: asaasCustomer.id } })
      customer.asaas_customer_id = asaasCustomer.id
    } catch (err) {
      console.warn('Não foi possível criar cliente na Asaas:', err)
    }
  }

  // Validate items and compute subtotal
  let subtotal = 0
  for (const it of items) {
    const product = await prisma.product.findUnique({ where: { id: it.product_id } })
    if (!product) throw new Error(`Produto ${it.product_id} não encontrado`)
    const price = product.price_per ?? 0
    subtotal += price * (it.quantity ?? 1)
  }

  // Recalculate shipping to ensure price consistency
  const shippingOptions = await calculateShipping({ addressId, address, items })
  const chosenShipping = shippingOptions.find((s: { id: string }) => s.id === shippingId)
  if (!chosenShipping) throw new Error('Opção de frete inválida')
  const shippingCost = chosenShipping.price
  const grandTotal = subtotal + shippingCost

  // Create order and items within transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        total: subtotal,
        shippingCost: shippingCost,
        grandTotal: grandTotal,/* @ts-ignore */
        shippingAddress: addressId ? (await tx.address.findUnique({ where: { id: addressId } })).street + '' : `${address?.street ?? ''}, ${address?.number ?? ''} - ${address?.city ?? ''}/${address?.state ?? ''} - ${address?.zipCode ?? ''}`,
        shippingMethod: chosenShipping.provider + ' - ' + chosenShipping.service,
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

      await tx.product.update({ where: { id: it.product_id }, data: { stock: { decrement: it.quantity ?? 0 } } })
    }

    return created
  })

  // Create payment on Asaas
  const billingType = paymentId.includes('pix') ? 'PIX' : paymentId.includes('boleto') ? 'BOLETO' : (paymentId.includes('card') ? 'CREDIT_CARD' : 'BOLETO')

  const paymentResult = await AsaasClient.createPayment({
    customer_asaaS_id: customer.asaas_customer_id ?? undefined,
    amount: grandTotal,
    billingType,
    description: `Pedido ${createdOrder.id}`,
    externalReference: createdOrder.id,
    dueDate: null,
  })

  // Persist Payment record (map fields and handle optionals)
  const payment = await prisma.payment.create({
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

  // Return useful payload to frontend
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
