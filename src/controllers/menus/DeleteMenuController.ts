import { Request, Response } from "express";
import { DeleteMenuService } from "../../services/menus/DeleteMenuService";

export class DeleteMenuController {
    async handle(req: Request, res: Response) {
        // suportamos via body.id_delete = [ ... ] ou body.id = "..."
        const idsRaw = req.body.id_delete ?? (req.body.id ? [req.body.id] : null);
        if (!idsRaw) {
            res.status(400).json({ message: "É preciso enviar body.id_delete ou body.id" });
        }

        // garantir array de strings
        const id_delete = Array.isArray(idsRaw)
            ? idsRaw.map((x: any) => String(x))
            : [String(idsRaw)];

        try {
            const result = await new DeleteMenuService().execute({ id_delete });
            res.json(result);
        } catch (err: any) {
            console.error("Erro ao excluir menus:", err);
            res.status(500).json({ message: err.message || "Erro interno ao deletar menus" });
        }
    }
}