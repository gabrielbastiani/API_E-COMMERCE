import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";

interface CreateFilterDTO {
  name: string;
  fieldName?: string | null;
  type: string;
  dataType?: string | null;
  displayStyle?: string | null;
  isActive?: boolean;
  order?: number;
  autoPopulate?: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  groupId?: string | null;
  attributeKeys?: string[] | null;
  forSearch?: boolean; // NOVO CAMPO
  options?: Array<any>;
}

interface UpdateFilterDTO extends Partial<CreateFilterDTO> {
  id: string;
}

class FilterService {
  async create(data: CreateFilterDTO) {
    const {
      attributeKeys,
      options,
      groupId,
      forSearch = false, // Valor padrão
      ...rest
    } = data;

    const payload: Record<string, any> = { ...rest, forSearch };

    // groupId: allow explicit null (set null) or undefined (omit)
    if (Object.prototype.hasOwnProperty.call(data, "groupId")) {
      payload.groupId = groupId === null ? null : groupId;
    }

    // attributeKeys is JSON column in schema
    if (Object.prototype.hasOwnProperty.call(data, "attributeKeys")) {
      payload.attributeKeys = attributeKeys === null ? null : (attributeKeys as Prisma.InputJsonValue);
    }

    // handle nested options if provided (createMany or connect) - simple create for now
    if (Array.isArray(options) && options.length > 0) {
      payload.options = options as any;
    }

    const created = await prismaClient.filter.create({
      data: payload as any
    });

    return created;
  }

  async findAll() {
    return prismaClient.filter.findMany({
      include: {
        group: true,
        categoryFilter: {
          include: {
            category: true
          }
        }
      },
      orderBy: { order: "asc" }
    });
  }

  async findById(id: string) {
    return prismaClient.filter.findUnique({
      where: { id },
      include: {
        group: true,
        categoryFilter: {
          include: {
            category: true
          }
        }
      }
    });
  }

  async update({ id, attributeKeys, options, groupId, forSearch, ...rest }: UpdateFilterDTO) {
    const payload: Record<string, any> = { ...rest };

    if (Object.prototype.hasOwnProperty.call(arguments[0], "groupId")) {
      payload.groupId = groupId === null ? null : groupId;
    }

    if (Object.prototype.hasOwnProperty.call(arguments[0], "attributeKeys")) {
      payload.attributeKeys = attributeKeys === null ? null : (attributeKeys as Prisma.InputJsonValue);
    }

    if (Object.prototype.hasOwnProperty.call(arguments[0], "forSearch")) {
      payload.forSearch = forSearch;
    }

    if (Array.isArray(options)) {
      payload.options = options as any;
    }

    const updated = await prismaClient.filter.update({
      where: { id },
      data: payload as any
    });

    return updated;
  }

  async delete(id: string) {
    return prismaClient.filter.delete({
      where: { id }
    });
  }
}

export { FilterService };