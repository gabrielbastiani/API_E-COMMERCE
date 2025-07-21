import { Request, Response } from 'express';
import { CategoriesStoreHomeService } from '../../services/category/CategoriesStoreHomeService';

class CategoriesStoreHomeController {
  async handle(req: Request, res: Response) {
    const categoriesService = new CategoriesStoreHomeService();
    const categories = await categoriesService.execute();

    res.json(categories);
  }
}

export { CategoriesStoreHomeController };