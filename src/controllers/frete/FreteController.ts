import { Request, Response } from 'express';
import { calculateFreight, CartItem } from '../../services/frete/FreteService';

export async function calculateFreightHandler(
    req: Request,
    res: Response
) {
    try {
        const { cepDestino, items } = req.body as {
            cepDestino: string;
            items: CartItem[];
        };

        if (!cepDestino || !Array.isArray(items)) {
            res.status(400).json({ error: 'Dados inválidos' });
        }

        const options = await calculateFreight(cepDestino, items);
        res.json({ options });
    } catch (err: any) {
        console.error('Erro no controlador de frete:', err);
        res.status(500).json({ error: 'Falha ao calcular frete' });
    }
}