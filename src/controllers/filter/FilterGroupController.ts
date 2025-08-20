import { Request, Response } from "express";
import { FilterGroupService } from "../../services/filter/FilterGroupService";

class FilterGroupController {
    private service = new FilterGroupService();

    async handleCreate(req: Request, res: Response) {
        try {
            const group = await this.service.create(req.body);
            res.status(201).json(group);
        } catch (err: any) {
            console.error("Error creating group:", err);
            res.status(400).json({ error: err.message || "Erro ao criar grupo" });
        }
    }

    async handleGetAll(_req: Request, res: Response) {
        try {
            const list = await this.service.findAll();
            res.json(list);
        } catch (err: any) {
            console.error("Error getAll groups:", err);
            res.status(500).json({ error: "Erro interno" });
        }
    }

    async handleGetOne(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const group = await this.service.findById(id);
            if (!group) {
                res.status(404).json({ error: "Not found" });
                return;
            }
            res.json(group);
        } catch (err: any) {
            console.error("Error get group:", err);
            res.status(500).json({ error: "Erro interno" });
        }
    }

    async handleUpdate(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updated = await this.service.update({ id, ...req.body });
            res.json(updated);
        } catch (err: any) {
            console.error("Error update group:", err);
            res.status(400).json({ error: err.message || "Erro ao atualizar grupo" });
        }
    }

    async handleDelete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await this.service.delete(id);
            res.status(204).send();
        } catch (err: any) {
            console.error("Error delete group:", err);
            res.status(400).json({ error: err.message || "Erro ao excluir grupo" });
        }
    }
}

export { FilterGroupController };