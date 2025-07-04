import prismaClient from "../../prisma";

interface UpdateMenuDTO {
    id: string;
    name?: string;
    isActive?: boolean;
    order?: number;
}

export class UpdateMenuService {
    async execute({ id, name, isActive, order }: UpdateMenuDTO) {
        const menu = await prismaClient.menu.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(isActive !== undefined && { isActive }),
                ...(order !== undefined && { order }),
            },
        });
        return menu;
    }
}