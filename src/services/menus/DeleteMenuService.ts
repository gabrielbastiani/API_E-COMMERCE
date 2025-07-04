import prismaClient from "../../prisma";

export class DeleteMenuService {
  async execute(id: string) {
    // opcional: antes de excluir, pode desmontar items em cascata
    await prismaClient.menuItem.deleteMany({ where: { menu_id: id } });
    await prismaClient.menu.delete({ where: { id } });
    return { message: "Menu excluído com sucesso" };
  }
}