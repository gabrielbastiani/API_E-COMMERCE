import { Request, Response } from "express";
import { UpdateCategoryFilterService } from "../../services/filter/UpdateCategoryFilterService"; 

class UpdateCategoryFilterController {
    private service = new UpdateCategoryFilterService();

    async handleCreate(req: Request, res: Response) {
        const cf = await this.service.create(req.body);
        res.status(201).json(cf);
    }

    async handleGetAll(_req: Request, res: Response) {
        const list = await this.service.findAll();
        res.json(list);
    }

    async handleGetOne(req: Request, res: Response) {
        const { id } = req.params;
        const cf = await this.service.findById(id);
        if (!cf) res.status(404).json({ error: "Not found" });
        res.json(cf);
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

export { UpdateCategoryFilterController };