import { Request, Response } from "express";
import { MenuGetForStoreService } from "../../services/menus/MenuGetForStoreService";

export class MenuGetForStoreController {
  async getMenu(req: Request, res: Response) {
    const position = req.query.position as string;
    try {
      const items = await MenuGetForStoreService.getMenuStore(position);
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}