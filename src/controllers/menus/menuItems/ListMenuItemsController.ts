import { Request, Response } from "express";
import { ListMenuItemsService } from "../../../services/menus/menuItems/ListMenuItemsService";

export class ListMenuItemsController {
    async handle(req: Request, res: Response) {
        const { menu_id } = req.query;
        const items = await new ListMenuItemsService().execute(menu_id as string | undefined);
        res.json(items);
    }
}