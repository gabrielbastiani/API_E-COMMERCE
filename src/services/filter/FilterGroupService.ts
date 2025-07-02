import prismaClient from "../../prisma";

interface CreateFilterGroupDTO {
    name: string;
    order?: number;
}

interface UpdateFilterGroupDTO extends Partial<CreateFilterGroupDTO> {
    id: string;
}

class FilterGroupService {
    async create(data: CreateFilterGroupDTO) {
        return prismaClient.filterGroup.create({ data });
    }

    async findAll() {
        return prismaClient.filterGroup.findMany({
            include: { filters: true },
            orderBy: { order: "asc" }
        });
    }

    async findById(id: string) {
        return prismaClient.filterGroup.findUnique({
            where: { id },
            include: { filters: true }
        });
    }

    async update({ id, ...rest }: UpdateFilterGroupDTO) {
        return prismaClient.filterGroup.update({
            where: { id },
            data: rest
        });
    }

    async delete(id: string) {
        return prismaClient.filterGroup.delete({
            where: { id }
        });
    }
}

export { FilterGroupService };