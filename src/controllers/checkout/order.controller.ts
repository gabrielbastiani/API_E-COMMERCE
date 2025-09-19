import { Request, Response } from 'express';
import * as OrderService from '../../services/checkout/order.service';

export async function getOrderHandler(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        if (!id) {
            res.status(400).json({ message: 'order_id obrigatório' });
            return;
        }
        
        const order = await OrderService.getOrderById(id);
        res.json(order);
    } catch (err: any) {
        console.error('getOrderHandler error', err);
        if ((err as any).status === 404) {
            res.status(404).json({ message: err.message || 'Pedido não encontrado' });
        } else if ((err as any).status === 403) {
            res.status(403).json({ message: err.message || 'Não autorizado' });
        } else {
            res.status(500).json({ message: err.message ?? 'Erro ao buscar pedido' });
        }
    }
}