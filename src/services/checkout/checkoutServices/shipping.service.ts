import prisma from '../../../prisma';
import * as MelhorEnvioClient from '../melhorenvio.client';

export async function calculateShippingCost(params: {
  shippingCostFromFrontend?: number | null;
  shippingRaw?: any | null;
  addressId?: string | null;
  address?: any | null;
  items?: Array<any>;
}) {
  const { shippingCostFromFrontend, shippingRaw, addressId, address, items } = params;

  let shippingCost: number | undefined = undefined;
  if (typeof shippingCostFromFrontend === 'number' && !isNaN(shippingCostFromFrontend)) {
    shippingCost = shippingCostFromFrontend;
  }

  if (shippingCost == null) {
    try {
      if (shippingRaw && typeof shippingRaw.price === 'number') {
        shippingCost = shippingRaw.price;
      } else {
        let destZip: string | undefined;
        if (addressId) {
          const a = await prisma.address.findUnique({ where: { id: addressId } });
          if (!a) throw new Error('Endereço não encontrado para cálculo de frete');
          destZip = a.zipCode?.replace(/\D/g, '');
        } else if (address) {
          destZip = address.zipCode?.replace(/\D/g, '');
        } else {
          throw new Error('shippingCost não informado e endereço não disponível para cálculo');
        }

        if (!process.env.ORIGIN_CEP) throw new Error('Origin ZIP not configured on server (ORIGIN_CEP)');

        const products = (items || []).map((it) => ({
          name: 'Produto',
          quantity: it.quantity ?? 1,
          price: Number(it.price ?? 0),
          weight: it.weight ?? 0.1,
          width: it.width ?? 10,
          height: it.height ?? 2,
          length: it.length ?? 10,
        }));

        const quoteArr = await MelhorEnvioClient.quote({ from: process.env.ORIGIN_CEP!, to: destZip!, products });
        const first = Array.isArray(quoteArr) && quoteArr.length > 0 ? quoteArr[0] : null;
        if (!first || first.total == null) {
          throw new Error('MelhorEnvio: preço inválido na cotação');
        }
        shippingCost = Number(first.total);
      }
    } catch (err: any) {
      throw new Error(`Não foi possível calcular/validar o frete no servidor: ${err?.message ?? String(err)}. Envie shippingCost no payload se o frete já foi calculado no frontend.`);
    }
  }

  return shippingCost;
}