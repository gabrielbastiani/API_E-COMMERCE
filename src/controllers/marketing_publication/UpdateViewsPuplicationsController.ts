import { Request, Response } from "express";
import { UpdateViewsPuplicationsService } from "../../services/marketing_publication/UpdateViewsPuplicationsService";

class UpdateViewsPuplicationsController {
    async handle(req: Request, res: Response) {
        const { marketingPublication_id } = req.params;

        const service = new UpdateViewsPuplicationsService();

        try {
            const updatePublications = await service.execute({ marketingPublication_id, req });
            res.json(updatePublications);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }
}

export { UpdateViewsPuplicationsController };