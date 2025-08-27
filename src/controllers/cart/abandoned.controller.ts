import { Request, Response } from 'express';
import * as AbandonedService from '../../services/cart/abandoned.service';

export async function postAbandonedCart(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const cart_id: string = body.cart_id;
    const customer_id: string | undefined = body.customer_id;
    const items = Array.isArray(body.items) ? body.items : [];
    const total = typeof body.total === 'number' ? body.total : undefined;
    const discountCode = typeof body.discountCode === 'string' ? body.discountCode : undefined;

    if (!cart_id) {
      res.status(400).json({ error: 'cart_id obrigatório' });
    }
    if (!items.length) {
      res.status(400).json({ error: 'items obrigatório' });
    }

    const created = await AbandonedService.upsertAbandonedCart({ cart_id, customer_id, items, total, discountCode });
    res.json({ success: true, data: created });
  } catch (err: any) {
    console.error('POST /cart/abandoned error', err);
    res.status(500).json({ success: false, error: err?.message ?? String(err) });
  }
}

export async function getAbandonedCart(req: Request, res: Response) {
  try {
    const cartId = req.params.cartId;
    if (!cartId) res.status(400).json({ error: 'cartId obrigatório' });
    const found = await AbandonedService.getAbandonedCartByCartId(cartId);
    if (!found) res.status(404).json({ error: 'AbandonedCart não encontrado' });
    res.json({ success: true, data: found });
  } catch (err: any) {
    console.error('GET /cart/abandoned/:cartId error', err);
    res.status(500).json({ success: false, error: err?.message ?? String(err) });
  }
}