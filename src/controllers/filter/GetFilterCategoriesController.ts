import { Request, Response } from "express";
import { GetFilterCategoriesService } from "../../services/filter/GetFilterCategoriesService";

class GetFilterCategoriesController {
    async handle(req: Request, res: Response) {
        const filter_id = req.query.filter_id as string;

        const categories = new GetFilterCategoriesService();

        const filter = await categories.execute({ filter_id });

        res.json(filter);
    }
}

export { GetFilterCategoriesController }