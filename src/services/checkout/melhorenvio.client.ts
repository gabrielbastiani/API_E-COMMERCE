import axios from 'axios'

const BASE = process.env.MELHORENVIO_BASE_URL ?? 'https://api.melhorenvio.com.br'
const TOKEN = process.env.MELHOR_ENVIO_TOKEN

if (!TOKEN) console.warn('MELHOR ENVIO token not configured')

// Quote: accepts { from, to(zip) } and products array
export async function quote({ from, to, products }: { from: string; to: string; products: any[] }) {
  const payload = {
    from: (from || '').toString().replace(/[^0-9]/g, ''),
    to: (to || '').toString().replace(/[^0-9]/g, ''),
    products: products.map(p => ({
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      weight: p.weight,
      length: p.length,
      height: p.height,
      width: p.width,
    })),
  }

  const headers: any = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  }

  const url = `${BASE}/cotacoes`
  const resp = await axios.post(url, payload, { headers })
  const data = resp.data
  const results = (data?.cotacoes || data?.results || []).map((c: any) => ({
    carrier: c.transportadora ?? c.carrier ?? c.service?.carrier ?? 'MelhorEnvio',
    service: c.name ?? c.service?.name ?? c.servico ?? c.service_code ?? 'service',
    total: Number(c.price ?? c.total ?? c.valor ?? 0),
    deadline: c.deadline ?? c.estimated_delivery_time ?? c.delivery_time ?? null,
    raw: c,
  }))

  return results
}
