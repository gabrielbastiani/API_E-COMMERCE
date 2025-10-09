import { Request, Response } from 'express';
import { CreateAndUpdateFilterService } from '../../services/filter/CreateAndUpdateFilterService';

const service = new CreateAndUpdateFilterService();

class CreateAndUpdateFilterController {
    async handleCreate(req: Request, res: Response) {
        try {
            const created = await service.create(req.body);
            res.status(201).json(created);
        } catch (err) {
            console.error('Filter create error', err);
            res.status(500).json({ error: 'Erro interno' });
        }
    }

    async handleGetAll(_req: Request, res: Response) {
        try {
            const list = await service.findAll();
            res.json(list);
        } catch (err) {
            console.error('Filter getAll error', err);
            res.status(500).json({ error: 'Erro interno' });
        }
    }

    async handleGetOne(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const f = await service.findById(id);
            if (!f) res.status(404).json({ error: 'Not found' });
            res.json(f);
        } catch (err) {
            console.error('Filter getOne error', err);
            res.status(500).json({ error: 'Erro interno' });
        }
    }

    async handleUpdate(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updated = await service.update({ id, ...req.body });
            res.json(updated);
        } catch (err) {
            console.error('Filter update error', err);
            res.status(500).json({ error: 'Erro interno' });
        }
    }

    async handleDelete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await service.delete(id);
            res.status(204).send();
        } catch (err) {
            console.error('Filter delete error', err);
            res.status(500).json({ error: 'Erro interno' });
        }
    }
}

export { CreateAndUpdateFilterController };