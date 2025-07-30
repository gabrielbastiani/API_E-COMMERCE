import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = process.env.MELHOR_ENVIO_API_URL!;
const TOKEN = process.env.MELHOR_ENVIO_TOKEN!;
const ORIGIN = process.env.ORIGIN_CEP!;

export interface CartItem {
  quantity: number;
  weight: number;
  length: number;
  height: number;
  width: number;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  deliveryTime: string;
}

export async function calculateFreight(
  cepDestino: string,
  items: CartItem[]
): Promise<ShippingOption[]> {
  const payload = {
    from: { postal_code: ORIGIN },
    to: { postal_code: cepDestino },
    products: items.map(i => ({
      quantity: i.quantity,
      weight: i.weight,
      length: i.length,
      height: i.height,
      width: i.width,
    })),
  };

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'MinhaLojaVirtual/1.0 [email protected]',
  };

  const url = `${API_BASE}/api/v2/me/shipment/calculate`;
  const res = await axios.post(url, payload, { headers });

  // trata tanto array direto quanto object.shipments
  const shipmentsRaw: any[] = Array.isArray(res.data)
    ? res.data
    : res.data.shipments ?? [];

  return shipmentsRaw.map(s => {
    // preço vem como string
    const priceNum = parseFloat(s.price);

    // formata prazo: se vier range, usa min–max dias, senão usa delivery_time único
    let prazoText: string;
    if (s.delivery_range && s.delivery_range.min != null && s.delivery_range.max != null) {
      prazoText = `Em até ${s.delivery_range.min}–${s.delivery_range.max} dias úteis`;
    } else if (s.delivery_time != null) {
      prazoText = `Em até ${s.delivery_time} dias úteis`;
    } else {
      prazoText = 'Prazo indisponível';
    }

    return {
      id: String(s.id),
      name: s.name,
      price: priceNum,
      deliveryTime: prazoText,
    };
  });
}