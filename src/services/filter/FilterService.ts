import prismaClient from "../../prisma";
import {
    FilterType,
    FilterDataType,
    FilterDisplayStyle
} from "@prisma/client";

interface CreateFilterDTO {
    name: string;
    fieldName: string;
    type: FilterType;
    dataType: FilterDataType;
    displayStyle: FilterDisplayStyle;
    isActive?: boolean;
    order?: number;
    autoPopulate?: boolean;
    minValue?: number | null;
    maxValue?: number | null;
    groupId?: string | null;
    options?: {
        id?: string;
        label: string;
        value: string;
        order?: number;
        iconUrl?: string | null;
        colorCode?: string | null;
        isDefault?: boolean;
    }[];
}

interface UpdateFilterDTO extends Partial<CreateFilterDTO> {
    id: string;
}

class FilterService {
    async create(data: CreateFilterDTO) {
        const { options, groupId, ...filterData } = data;

        return prismaClient.filter.create({
            data: {
                ...filterData,
                // relaciona Grupo se houver:
                ...(groupId
                    ? { group: { connect: { id: groupId } } }
                    : {}),
                // nested create de opções se houver:
                ...(options && options.length
                    ? {
                        options: {
                            create: options.map(o => ({
                                label: o.label,
                                value: o.value,
                                order: o.order ?? 0,
                                iconUrl: o.iconUrl ?? null,
                                colorCode: o.colorCode ?? null,
                                isDefault: o.isDefault ?? false,
                            }))
                        }
                    }
                    : {})
            },
            include: {
                group: true,
                options: true
            }
        });
    }

    async findAll() {
        return prismaClient.filter.findMany({
            include: {
                group: true,
                options: true,
                category: true,
                categoryFilter: true,
                directCategories: true
            },
            orderBy: { order: "asc" }
        });
    }

    async findById(id: string) {
        return prismaClient.filter.findUnique({
            where: { id },
            include: {
                group: true,
                options: true,
                category: true,
                categoryFilter: true,
                directCategories: true
            }
        });
    }

    async update(dto: UpdateFilterDTO) {
        const {
            id,
            groupId,
            options = [],
            ...dataFields
        } = dto;

        return prismaClient.$transaction(async (prisma) => {
            // 1) Atualiza dados básicos e relação de grupo
            await prisma.filter.update({
                where: { id },
                data: {
                    ...dataFields,
                    ...(groupId === undefined
                        ? {}
                        : groupId
                            ? { group: { connect: { id: groupId } } }
                            : { group: { disconnect: true } })
                }
            });

            // 2) Busca IDs reais existentes
            const existing = await prisma.filterOption.findMany({
                where: { filter_id: id },
                select: { id: true }
            });
            const existingIds = existing.map(x => x.id);

            // 3) Deleta quaisquer opções que NÃO vieram no payload **com** IDs reais
            await prisma.filterOption.deleteMany({
                where: {
                    filter_id: id,
                    id: { notIn: existingIds.filter(eid => options.some(o => o.id === eid)) }
                }
            });

            // 4) Upsert: para cada opção:
            for (const opt of options) {
                if (opt.id && existingIds.includes(opt.id)) {
                    // update
                    await prisma.filterOption.update({
                        where: { id: opt.id },
                        data: {
                            label: opt.label,
                            value: opt.value,
                            order: opt.order ?? 0,
                            iconUrl: opt.iconUrl ?? null,
                            colorCode: opt.colorCode ?? null,
                            isDefault: opt.isDefault ?? false
                        }
                    });
                } else {
                    // create
                    await prisma.filterOption.create({
                        data: {
                            filter: { connect: { id } },
                            label: opt.label,
                            value: opt.value,
                            order: opt.order ?? 0,
                            iconUrl: opt.iconUrl ?? null,
                            colorCode: opt.colorCode ?? null,
                            isDefault: opt.isDefault ?? false
                        }
                    });
                }
            }

            // 5) Retorna o filtro atualizado com opções
            return prisma.filter.findUnique({
                where: { id },
                include: { options: true, group: true }
            });
        });
    }

    async delete(id: string) {
        return prismaClient.filter.delete({ where: { id } });
    }
}

export { FilterService };