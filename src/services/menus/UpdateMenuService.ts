import prismaClient from "../../prisma";
import fs from "fs";
import path from "path";

interface UpdateMenuDTO {
    id: string;
    name?: string;
    isActive?: boolean;
    order?: number;
    icon?: string;
    position?: string;
    identifier?: string;
}

export class UpdateMenuService {
    async execute({ id, name, isActive, order, icon, position, identifier }: UpdateMenuDTO) {
        // 1) buscar menu existente
        const existing = await prismaClient.menu.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new Error("Menu não encontrado");
        }

        // 2) se veio novo ícone e já havia um antigo, removemos o arquivo antigo
        if (icon && existing.icon && icon !== existing.icon) {
            const oldPath = path.resolve("images", existing.icon);
            fs.unlink(oldPath, err => {
                if (err) console.warn("Erro ao remover ícone antigo:", err);
            });
        }

        // 3) montar dados de update
        const data: any = {
            ...(name !== undefined && { name }),
            ...(isActive !== undefined && { isActive }),
            ...(order !== undefined && { order }),
            ...(icon !== undefined && { icon }),
            ...(position !== undefined && { position }),
            ...(identifier !== undefined && { identifier })
        };

        // 4) executar update
        const menu = await prismaClient.menu.update({
            where: { id },
            data,
        });

        return menu;
    }
}