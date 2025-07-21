import { Request, Response } from "express";
import { UpdateViewsService } from "../../services/product/UpdateViewsService"; 

class UpdateViewsController {
    async handle(req: Request, res: Response) {

        const { product_id } = req.params;
        const service = new UpdateViewsService();

        try {
            const result = await service.execute({ product_id, req });
            res.status(200).json(result);
        } catch (err: any) {
            console.error('Error updating views:', err);
            res.status(500).json({
                error: err.message || 'Internal server error'
            });
        }
    }
}

export { UpdateViewsController };