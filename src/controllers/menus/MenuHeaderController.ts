import { Request, Response } from "express";
import { MenuHeaderService } from "../../services/menus/MenuHeaderService";

export class MenuHeaderController {
  // GET /menu/top
  async getTop(req: Request, res: Response) {
    try {
      const items = await MenuHeaderService.getTopMenu();
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}