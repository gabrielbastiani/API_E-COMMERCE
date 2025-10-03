import { Request, Response } from 'express';
import { CategoryFiltersService } from '../../services/filter/CategoryFiltersService'; 

class CategoryFiltersController {
  async getFiltersByCategorySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      
      if (!slug) {
        res.status(400).json({ error: 'Slug da categoria é obrigatório' });
      }

      const service = new CategoryFiltersService();
      const filters = await service.getFiltersByCategorySlug(slug);
      
      res.json(filters);
    } catch (error) {
      console.error('Error getting category filters:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export { CategoryFiltersController };