import prismaClient from "../../prisma";

interface CreateFilterOptionDTO {
    filter_id: string;
    label: string;
    value: string;
    order?: number;
    iconUrl?: string;
    colorCode?: string;
    isDefault?: boolean;
}

interface UpdateFilterOptionDTO extends Partial<CreateFilterOptionDTO> {
    id: string;
}

class FilterOptionService {
    async create(data: CreateFilterOptionDTO) {
        return prismaClient.filterOption.create({ data });
    }

    async findAll() {
        return prismaClient.filterOption.findMany({
            include: { filter: true },
            orderBy: { order: "asc" }
        });
    }

    async findById(id: string) {
        return prismaClient.filterOption.findUnique({
            where: { id },
            include: { filter: true }
        });
    }

    async update({ id, ...rest }: UpdateFilterOptionDTO) {
        return prismaClient.filterOption.update({
            where: { id },
            data: rest
        });
    }

    async delete(id: string) {
        return prismaClient.filterOption.delete({
            where: { id }
        });
    }
}

export { FilterOptionService };