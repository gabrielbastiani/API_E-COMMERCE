import { Request, Response } from "express";
import { DeleteMenuService } from "../../services/menus/DeleteMenuService";

export class DeleteMenuController {
    async handle(req: Request, res: Response) {
        const { id } = req.params;
        const result = await new DeleteMenuService().execute(id);
        res.json(result);
    }
}