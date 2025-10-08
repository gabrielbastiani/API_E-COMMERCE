import { Request, Response } from "express";
import { searchProducts } from "../../services/product/NavBarSearchProductStoreService";

export async function searchController(req: Request, res: Response) {
    try {
        const term = String(req.query.q || "").trim();
        const page = Number(req.query.page || 1);
        const perPage = Number(req.query.perPage || 20);

        if (!term) {
            res.status(400).json({ error: "O parâmetro de busca 'q' é obrigatório." });
        }

        const { items, total } = await searchProducts({ term, page, perPage });

        res.json({
            data: items,
            meta: {
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            },
        });
    } catch (error) {
        console.error("Erro no searchController:", error);
        res.status(500).json({ error: "Erro interno ao buscar produtos." });
    }
}