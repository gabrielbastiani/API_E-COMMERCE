import { Request, Response } from "express";
import { StatusFilterService } from "../../services/filter/StatusFilterService";

class StatusFilterController {
    async handle(req: Request, res: Response) {
        const { filter_id, isActive } = req.body;

        const statusFilter = new StatusFilterService();

        const filter = await statusFilter.execute({ filter_id, isActive });

        res.json(filter);
    }
}

export { StatusFilterController }