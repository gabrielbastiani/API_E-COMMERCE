import { Request, Response } from 'express';
import { CategoryPageService } from '../../services/category/CategoryPageService';

class CategoryPageController {
    async handle(req: Request, res: Response) {

        const slug = req.query.slug as string;

        const category = new CategoryPageService();
        const dataCategory = await category.execute({ slug });

        res.json(dataCategory);
    }
}

export { CategoryPageController };