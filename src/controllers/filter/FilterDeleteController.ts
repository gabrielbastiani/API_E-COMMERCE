import { Request, Response } from "express";
import { FilterDeleteService } from "../../services/filter/FilterDeleteService";

export class FilterDeleteController {
    async handle(req: Request, res: Response) {
        try {
            let { id_delete } = req.body as { id_delete: string | string[] };

            // normaliza para array
            if (!Array.isArray(id_delete)) {
                id_delete = [id_delete];
            }

            const service = new FilterDeleteService();
            await service.execute(id_delete);

            res
                .status(200)
                .json({ message: "Filtro(s) excluído(s) com sucesso." });
        } catch (err) {
            console.error("❌ [FilterDeleteController] Error:", err);
            res
                .status(500)
                .json({ error: "Erro interno ao deletar filtro(s)." });
        }
    }
}