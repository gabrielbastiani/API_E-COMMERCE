import prismaClient from "../../prisma";

interface FilterPropos {
    filter_id: string;
    isActive: boolean;
}

class StatusFilterService {
    async execute({ filter_id, isActive }: FilterPropos) {
        const promotion = await prismaClient.filter.update({
            where: { id: filter_id },
            data: {
                isActive: isActive
            }
        });

        return promotion;

    }
}

export { StatusFilterService }