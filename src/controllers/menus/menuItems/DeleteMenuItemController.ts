import { Request, Response } from "express";
import { DeleteMenuItemService } from "../../../services/menus/menuItems/DeleteMenuItemService";

export class DeleteMenuItemController {
    async handle(req: Request, res: Response) {
        const { id } = req.params;
        try {
            const result = await new DeleteMenuItemService().execute(id);
            res.json(result);
        } catch (err: any) {
            console.error("Erro ao excluir MenuItem:", err);
            res.status(500).json({
                message: err.message || "Erro interno ao excluir item de menu",
            });
        }
    }
}