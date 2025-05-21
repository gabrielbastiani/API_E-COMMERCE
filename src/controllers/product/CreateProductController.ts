import { Request, Response } from "express";
import { CreateProductService } from "../../services/product/CreateProductService";

class CreateProductController {
    async handle(req: Request, res: Response) {
        try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            const productData = {
                ...req.body,
                keywords: req.body.keywords ? JSON.parse(req.body.keywords) : [],
                categories: req.body.categories ? JSON.parse(req.body.categories) : [],
                descriptions: req.body.descriptions ? JSON.parse(req.body.descriptions) : [],
                variants: req.body.variants ? JSON.parse(req.body.variants) : [],
                relations: req.body.relations ? JSON.parse(req.body.relations) : []
            };

            const createProductService = new CreateProductService();
            const product = await createProductService.execute(productData, files);

            res.json(product);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

export { CreateProductController };