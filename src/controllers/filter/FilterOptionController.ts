import { Request, Response } from "express";
import { FilterOptionService } from "../../services/filter/FilterOptionService"; 

class FilterOptionController {
    private service = new FilterOptionService();

    async handleCreate(req: Request, res: Response) {
        const option = await this.service.create(req.body);
        res.status(201).json(option);
    }

    async handleGetAll(_req: Request, res: Response) {
        const list = await this.service.findAll();
        res.json(list);
    }

    async handleGetOne(req: Request, res: Response) {
        const { id } = req.params;
        const option = await this.service.findById(id);
        if (!option) res.status(404).json({ error: "Not found" });
        res.json(option);
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

export { FilterOptionController };