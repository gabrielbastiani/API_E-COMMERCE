import { Request, Response } from 'express'
import { ItemMenuImageDeleteService } from '../../../services/menus/menuItems/ItemMenuImageDeleteService'; 

class ItemMenuImageDeleteController {
    async handle(req: Request, res: Response) {

        const menuItem_id = req.query.menuItem_id as string;

        const item_menu = new ItemMenuImageDeleteService();

        const item = await item_menu.execute({ menuItem_id });

        res.json(item);

    }
}

export { ItemMenuImageDeleteController }