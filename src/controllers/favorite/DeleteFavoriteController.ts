import { Request, Response } from 'express';
import { DeleteFavoriteService } from '../../services/favorite/DeleteFavoriteService'; 

class DeleteFavoriteController {
  async handle(req: Request, res: Response) {
    try {
      const customer_id = req.query.customer_id as string;
      const product_id = req.query.product_id as string;

      const deleteFavorite = new DeleteFavoriteService();

      const favorite = await deleteFavorite.execute({
        customer_id,
        product_id
      });

      res.json(favorite);
    } catch (err: any) {
      // Se preferir diferenciar erros do Prisma, trate por err.code (ex: 'P2025' recurso não encontrado)
      if (err?.code === 'P2025') {
        res.status(404).json({ error: 'Favorite not found' });
      }
      res.status(500).json({ error: 'Internal server error', details: err?.message });
    }
  }
}

export { DeleteFavoriteController }