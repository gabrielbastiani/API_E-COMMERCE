import prismaClient from "../../../prisma";

export class DeleteMenuItemService {
    async execute(id: string) {
        await prismaClient.menuItem.delete({ where: { id } });
        return { message: "MenuItem excluído com sucesso" };
    }
}