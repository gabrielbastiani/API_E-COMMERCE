import prismaClient from "../../../prisma";
import fs from "fs";
import path from "path";

export class DeleteMenuItemService {
    async execute(id: string) {
        // 1) buscar antes de deletar
        const existing = await prismaClient.menuItem.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new Error("MenuItem não encontrado");
        }

        // 2) se tiver ícone, remover do disco
        if (existing.icon) {
            const filePath = path.resolve("images", "menu", existing.icon);
            fs.unlink(filePath, err => {
                if (err) {
                    console.warn("Falha ao remover arquivo de ícone:", err);
                }
            });
        }

        // 3) deletar do banco
        await prismaClient.menuItem.delete({ where: { id } });

        return { message: "MenuItem excluído com sucesso" };
    }
}