import prismaClient from "../../prisma";

export class FilterDeleteService {
    async execute(id_delete: string[]): Promise<void> {
        if (!Array.isArray(id_delete) || id_delete.length === 0) {
            return;
        }

        await prismaClient.$transaction(async (prisma) => {
            // 1) Remove todos os categoryFilters ligados a estes filtros
            await prisma.categoryFilter.deleteMany({
                where: { filter_id: { in: id_delete } }
            });

            // 3) Remove os próprios filtros
            await prisma.filter.deleteMany({
                where: { id: { in: id_delete } }
            });
        });
    }
}