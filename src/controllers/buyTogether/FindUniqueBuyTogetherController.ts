import { Request, Response } from "express";
import { FindUniqueBuyTogetherService } from "../../services/buyTogether/FindUniqueBuyTogetherService";

export class FindUniqueBuyTogetherController {
  // Promise<void> para não retornar Response
  async handle(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id || "").trim();
    if (!id) {
      res.status(400).json({ error: "O parâmetro :id é obrigatório." });
      return;
    }

    try {
      const svc = new FindUniqueBuyTogetherService();
      const detail = await svc.execute(id);
      if (!detail) {
        res.status(404).json({ error: "Grupo Compre Junto não encontrado." });
        return;
      }
      res.json(detail);
      return;
    } catch (err) {
      console.error("❌ [FindUniqueBuyTogetherController]", err);
      res.status(500).json({ error: "Erro interno ao buscar grupo." });
      return;
    }
  }
}