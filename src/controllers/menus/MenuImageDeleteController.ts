import { Request, Response } from 'express'
import { MenuImageDeleteService } from '../../services/menus/MenuImageDeleteService'; 

class MenuImageDeleteController {
    async handle(req: Request, res: Response) {

        const menu_id = req.query.menu_id as string;

        const menu = new MenuImageDeleteService();

        const image = await menu.execute({ menu_id });

        res.json(image);

    }
}

export { MenuImageDeleteController }