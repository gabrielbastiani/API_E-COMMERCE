import { Request, Response } from 'express';
import { CategoryCreateService } from '../../services/category/CategoryCreateService';

class CategoryCreateController {
    async handle(req: Request, res: Response) {
        const {
            userEcommerce_id,
            name,
            image,
            description,
            parentId
        } = req.body;

        const create_category = new CategoryCreateService();

        let imageToUpdate = image;
        if (!image && req.file) {
            imageToUpdate = req.file.filename;
        }

        const category = await create_category.execute({
            userEcommerce_id,
            name,
            description,
            image: imageToUpdate,
            parentId
        });

        res.json(category);
    }
}

export { CategoryCreateController };