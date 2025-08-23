// exemplo em melhorenvio.client.ts
import axios from 'axios';
const client = axios.create({ baseURL: process.env.MELHOR_ENVIO_BASE, timeout: 15000 });

// função quote que seu service usa
export async function quote({ from, to, products }: { from: string; to: string; products: any[] }) {
  try {
    const resp = await client.post('/shipment/calculate', { from, to, products });
    return resp.data.options ?? resp.data;
  } catch (err: any) {
    console.error('MelhorEnvio quote error request payload:', { from, to, products });
    if (err?.response) {
      console.error('MelhorEnvio response status:', err.response.status);
      console.error('MelhorEnvio response data:', err.response.data);
      throw new Error(`MelhorEnvio error: ${JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
}