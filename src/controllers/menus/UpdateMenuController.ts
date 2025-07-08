import { Request, Response } from "express";
import { UpdateMenuService } from "../../services/menus/UpdateMenuService";

export class UpdateMenuController {
  async handle(req: Request, res: Response) {
    
    const { id } = req.params;
    const { name, order: orderRaw, isActive: isActiveRaw } = req.body;

    // 1) converter tipos vindos de multipart/form-data (strings) para number/boolean
    const isActive = (() => {
      if (typeof isActiveRaw === "boolean") return isActiveRaw;
      if (typeof isActiveRaw === "string") {
        return isActiveRaw.toLowerCase() === "true";
      }
      return true;
    })();

    const order = Number(orderRaw);
    if (orderRaw !== undefined && isNaN(order)) {
      res.status(400).json({ message: "order precisa ser um número válido" });
    }

    // 2) definir icon: se veio via file upload, usar filename; 
    //    senão, se o client reenviou o nome no body, usa body.icon
    let icon: string | undefined = undefined;
    if (req.file && req.file.filename) {
      icon = req.file.filename;
    } else if (req.body.icon) {
      icon = req.body.icon;
    }

    // 3) chamar service
    try {
      const menu = await new UpdateMenuService().execute({
        id,
        name,
        isActive,
        order: orderRaw !== undefined ? order : undefined,
        icon,
      });
      res.json(menu);
    } catch (err: any) {
      console.error("Erro ao atualizar menu:", err);
      res.status(500).json({ message: err.message || "Erro interno" });
    }
  }
}