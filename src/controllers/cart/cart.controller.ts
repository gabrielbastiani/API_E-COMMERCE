import { Request, Response } from 'express'
import * as CartService from '../../services/cart/cart.service'

export async function createOrUpdateAbandoned(req: Request, res: Response) {
  try {
    const payload = req.body
    if (!payload || !payload.customer_id) {
      res.status(400).json({ ok: false, message: 'Payload inválido. customer_id é obrigatório.' })
    }

    const updated = await CartService.upsertCartAndAbandoned(payload)
    res.status(200).json({ ok: true, cart: updated })
  } catch (err: any) {
    console.error('[cart.controller] createOrUpdateAbandoned error:', err)
    res.status(400).json({ ok: false, message: err?.message ?? 'Erro ao criar/atualizar abandoned cart' })
  }
}

/**
 * DELETE /cart/abandoned/:cartId
 */
export async function deleteAbandoned(req: Request, res: Response) {
  try {
    const cartId = req.params.cartId
    if (!cartId) res.status(400).json({ ok: false, message: 'cartId é obrigatório' })
    await CartService.deleteAbandonedCartByCartId(cartId)
    res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('[cart.controller] deleteAbandoned error:', err)
    res.status(500).json({ ok: false, message: 'Erro ao remover abandoned cart' })
  }
}

export async function getCart(req: Request, res: Response) {
  try {
    // prioriza req.customer_id (setado pelo middleware), fallback query param
    const customerId = (req as any).customer_id ?? (req.query.customer_id as string | undefined)

    if (!customerId) {
      // resposta única e retorno imediato (evita continuar execução)
      res.status(400).json({ ok: false, message: 'customer_id obrigatório' })
    }

    const cart = await CartService.getCartByCustomer(customerId)
    res.status(200).json({ ok: true, cart })
  } catch (err: any) {
    console.error('[cart.controller] getCart error:', err)
    // garante que enviamos apenas UMA resposta
    res.status(500).json({ ok: false, message: err?.message ?? 'Erro ao buscar cart' })
  }
}