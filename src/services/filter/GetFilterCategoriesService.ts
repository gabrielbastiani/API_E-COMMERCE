import prismaClient from "../../prisma";

interface FilterPropos {
    filter_id: string;
}

class GetFilterCategoriesService {
    async execute({ filter_id }: FilterPropos) {
        const filtersCategory = await prismaClient.categoryFilter.findMany({
            where: {
                filter_id: filter_id
            },
            include: {
                category: true,
                filter: true
            }
        });

        return filtersCategory;

    }
}

export { GetFilterCategoriesService }