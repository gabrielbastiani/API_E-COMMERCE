import { Request, Response } from "express";
import { DeleteMenuItemService } from "../../../services/menus/menuItems/DeleteMenuItemService";

export class DeleteMenuItemController {
    async handle(req: Request, res: Response) {
        const { id } = req.params;
        const result = await new DeleteMenuItemService().execute(id);
        res.json(result);
    }
}