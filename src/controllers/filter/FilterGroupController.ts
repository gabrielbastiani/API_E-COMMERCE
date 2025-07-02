import { Request, Response } from "express";
import { FilterGroupService } from "../../services/filter/FilterGroupService"; 

class FilterGroupController {
    private service = new FilterGroupService();

    async handleCreate(req: Request, res: Response) {
        const group = await this.service.create(req.body);
        res.status(201).json(group);
    }

    async handleGetAll(_req: Request, res: Response) {
        const list = await this.service.findAll();
        res.json(list);
    }

    async handleGetOne(req: Request, res: Response) {
        const { id } = req.params;
        const group = await this.service.findById(id);
        if (!group) res.status(404).json({ error: "Not found" });
        res.json(group);
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

export { FilterGroupController };