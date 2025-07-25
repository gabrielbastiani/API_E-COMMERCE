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
    from: ORIGIN,
    to: cepDestino,
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
    // User-Agent exigido pela API:
    'User-Agent': 'MinhaLojaVirtual/1.0 [email protected]',
  };

  const url = `${API_BASE}/api/v2/me/shipment/calculate`;
  const res = await axios.post(url, payload, { headers });
  const shipments = res.data.shipments || [];
  return shipments.map((s: any) => ({
    id: s.service.id,
    name: s.service.name,
    price: s.price,
    deliveryTime: s.delivery_time,
  }));
}