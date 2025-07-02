import { Request, Response } from "express";
import { FilterService } from "../../services/filter/FilterService";

class FilterController {
    private service = new FilterService();

    async handleCreate(req: Request, res: Response) {
        const filter = await this.service.create(req.body);
        res.status(201).json(filter);
    }

    async handleGetAll(_req: Request, res: Response) {
        const list = await this.service.findAll();
        res.json(list);
    }

    async handleGetOne(req: Request, res: Response) {
        const { id } = req.params;
        const filter = await this.service.findById(id);
        if (!filter) res.status(404).json({ error: "Not found" });
        res.json(filter);
    }

    async handleUpdate(req: Request, res: Response) {
        const { id } = req.params;
        const updated = await this.service.update({ id, ...req.body });
        res.json(updated);
    }

    async handleDelete(req: Request, res: Response) {
        const { id } = req.params;
        await this.service.delete(id);
        res.status(204).send();
    }
}

export { FilterController };