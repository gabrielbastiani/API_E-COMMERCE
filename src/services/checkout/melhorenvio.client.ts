import axios from 'axios';

const BASE = process.env.MELHOR_ENVIO_API_URL ?? 'https://sandbox.melhorenvio.com.br';
const TOKEN = process.env.MELHOR_ENVIO_TOKEN ?? '';

if (!TOKEN) console.warn('MelhorEnvío token missing (MELHOR_ENVIO_TOKEN)');

const client = axios.create({
  baseURL: BASE,
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'MinhaLojaVirtual/1.0 [email protected]',
  },
});

/**
 * tenta parsear preço a partir de vários formatos (string com vírgula, campos diferentes, etc.)
 */
function parsePriceValue(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') {
    // remove símbolos e espaços
    let s = v.trim();
    // trocar vírgula por ponto (ex: "12,34")
    s = s.replace(/\./g, '').replace(/,/g, '.'); // remove thousands '.' then comma to dot
    // remove non numeric except dot and minus
    s = s.replace(/[^\d.-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  // objetos possivelmente com nested fields
  if (typeof v === 'object') {
    // attempt common keys
    for (const k of ['total', 'price', 'valor', 'amount', 'cost']) {
      if (k in v) {
        const parsed = parsePriceValue((v as any)[k]);
        if (parsed != null) return parsed;
      }
    }
  }
  return null;
}

/**
 * Quote / calcular cotação (wrap)
 * - retorna array normalizado: [{ id, name, total (number), raw }]
 */
export async function quote(opts: {
  from: string;
  to: string;
  products: Array<{ name?: string; quantity?: number; price?: number; weight?: number; width?: number; height?: number; length?: number }>;
}) {
  try {
    const url = `/api/v2/me/shipment/calculate`;
    const payload: any = {
      from: { postal_code: opts.from },
      to: { postal_code: opts.to },
      products: (opts.products || []).map((p) => ({
        name: p.name ?? 'Produto',
        quantity: p.quantity ?? 1,
        price: p.price ?? 0,
        weight: p.weight ?? 0.1,
        width: p.width ?? 10,
        height: p.height ?? 2,
        length: p.length ?? 10,
      })),
    };

    const resp = await client.post(url, payload);
    const data = resp.data;

    // extrair array de shipments / quotes de forma robusta
    const arr: any[] = Array.isArray(data) ? data : (data.shipments ?? data.quotes ?? data.results ?? []);

    const normalized = (arr || []).map((s: any) => {
      // tentar várias chaves
      const totalCandidates = [
        s.total, s.price, s.valor, s.amount, s.cost,
        s.price_total, s.price_amount, s.value, s.totals, s.total_price
      ];
      // também olhar nested: s.service?.price etc
      let total: number | null = null;
      for (const cand of totalCandidates) {
        total = parsePriceValue(cand);
        if (total != null) break;
      }
      // attempt deeper nested checks
      if (total == null && typeof s === 'object') {
        for (const k of Object.keys(s)) {
          const parsed = parsePriceValue(s[k]);
          if (parsed != null) { total = parsed; break; }
        }
      }

      return {
        id: String(s.id ?? s.service_id ?? s.carrier ?? Math.random().toString(36).slice(2, 9)),
        name: s.name ?? s.service ?? `${s.carrier ?? ''} ${s.service ?? ''}`.trim(),
        total,
        raw: s,
      };
    });

    return normalized;
  } catch (err: any) {
    const respData = err?.response?.data ?? err?.message ?? String(err);
    throw new Error(`MelhorEnvio error: ${JSON.stringify(respData)}`);
  }
}