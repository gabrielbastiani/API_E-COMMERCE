import { Request, Response } from "express";
import { CartService } from "../../services/cart/CartService";

export class CartController {
    // GET /cart
    async getCart(req: Request, res: Response) {
        try {
            const customer_id = req.customer_id!;
            const cart = await CartService.getCart(customer_id);
            res.json(cart);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    // POST /cart/items
    async addItem(req: Request, res: Response) {
        try {
            const customer_id = req.customer_id!;
            const { product_id, quantity = 1, variant_id = null } = req.body;

            if (!product_id) {
                res.status(400).json({ error: "product_id é obrigatório" });
            }

            const cart = await CartService.addItem(customer_id, product_id, quantity, variant_id);
            res.json(cart);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }

    // PUT /cart/items/:itemId
    async updateItem(req: Request, res: Response) {
        try {
            const customer_id = req.customer_id!;
            const { itemId } = req.params;
            const { quantity } = req.body;
            const cart = await CartService.updateItem(customer_id, itemId, quantity);
            res.json(cart);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }

    // DELETE /cart/items/:itemId
    async removeItem(req: Request, res: Response) {
        try {
            const customer_id = req.customer_id!;
            const { itemId } = req.params;
            const cart = await CartService.removeItem(customer_id, itemId);
            res.json(cart);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }

    // DELETE /cart
    async clearCart(req: Request, res: Response) {
        try {
            const customer_id = req.customer_id!;
            const cart = await CartService.clearCart(customer_id);
            res.json(cart);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
}