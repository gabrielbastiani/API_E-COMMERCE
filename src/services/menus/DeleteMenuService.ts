import fs from "fs";
import path from "path";
import prismaClient from "../../prisma"; 

interface DeleteMenuDTO {
  id_delete: string[]; 
}

export class DeleteMenuService {
  async execute({ id_delete }: DeleteMenuDTO) {
    if (!id_delete || id_delete.length === 0) {
      throw new Error("Nenhum ID de menu fornecido");
    }

    // 1) buscar todos os menus com seus items
    const menus = await prismaClient.menu.findMany({
      where: { id: { in: id_delete } },
      include: { items: true },
    });

    // 2) para cada menu encontrado, remover ícone e ícones dos items
    for (const menu of menus) {
      // a) ícone do menu
      if (menu.icon) {
        const menuIconPath = path.resolve("images", "menu", menu.icon);
        fs.unlink(menuIconPath, err => {
          if (err) console.warn(`Falha ao remover ícone do menu ${menu.id}:`, err);
        });
      }

      // b) ícones de cada item
      for (const item of menu.items) {
        if (item.icon) {
          const itemIconPath = path.resolve("images", "menu", item.icon);
          fs.unlink(itemIconPath, err => {
            if (err) console.warn(`Falha ao remover ícone do item ${item.id}:`, err);
          });
        }
      }
    }

    // 3) apagar todos os items associados a esses menus
    await prismaClient.menuItem.deleteMany({
      where: { menu_id: { in: id_delete } },
    });

    // 4) apagar os menus
    await prismaClient.menu.deleteMany({
      where: { id: { in: id_delete } },
    });

    return {
      message: id_delete.length > 1
        ? `${id_delete.length} menus excluídos com sucesso`
        : `Menu ${id_delete[0]} excluído com sucesso`
    };
  }
}