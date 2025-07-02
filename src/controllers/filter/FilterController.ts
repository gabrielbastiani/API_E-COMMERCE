import { Request, Response } from "express";
import { FilterService } from "../../services/filter/FilterService";

class FilterController {
    private service = new FilterService();

    async handleCreate(req: Request, res: Response) {
        try {
            const filter = await this.service.create(req.body);
            res.status(201).json(filter);
        } catch (err: any) {
            console.error("Error creating filter:", err);
            res
                .status(400)
                .json({ message: err.message || "Erro ao criar filtro" });
        }
    }

    async handleGetAll(_req: Request, res: Response) {
        const list = await this.service.findAll();
        res.json(list);
    }

    async handleGetOne(req: Request, res: Response) {
        const { id } = req.params;
        const filter = await this.service.findById(id);
        if (!filter) {
            res.status(404).json({ error: "Filtro não encontrado" });
        }
        res.json(filter);
    }

    async handleUpdate(req: Request, res: Response) {
        const { id } = req.params;
        try {
            const updated = await this.service.update({
                id,
                ...req.body
            });
            res.json(updated);
        } catch (err: any) {
            console.error("Error updating filter:", err);
            res
                .status(400)
                .json({ message: err.message || "Erro ao atualizar filtro" });
        }
    }

    async handleDelete(req: Request, res: Response) {
        const { id } = req.params;
        try {
            await this.service.delete(id);
            res.status(204).send();
        } catch (err: any) {
            console.error("Error deleting filter:", err);
            res
                .status(400)
                .json({ message: err.message || "Erro ao excluir filtro" });
        }
    }
}

export { FilterController };