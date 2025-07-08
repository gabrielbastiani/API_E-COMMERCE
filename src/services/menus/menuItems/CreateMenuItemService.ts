import { Prisma } from "@prisma/client";
import prismaClient from "../../../prisma";

interface CreateMenuItemDTO {
  label: string;
  type: "INTERNAL_LINK" | "EXTERNAL_LINK" | "CATEGORY" | "PRODUCT" | "CUSTOM_PAGE";
  url?: string;
  category_id?: string;
  product_id?: string;
  customPageSlug?: string;
  icon?: string;
  isActive?: boolean;
  order?: number;
  menu_id?: string;
  parentId?: string;
}

export class CreateMenuItemService {
  async execute(data: CreateMenuItemDTO) {
    const {
      label,
      type,
      url,
      category_id,
      product_id,
      customPageSlug,
      icon,
      isActive = true,
      order = 0,
      menu_id,
      parentId,
    } = data;

    // Monta dinamicamente, incluindo somente campos preenchidos
    const createData: Prisma.MenuItemUncheckedCreateInput = {
      label,
      type,
      isActive,
      order,
      ...(url ? { url } : {}),
      ...(category_id ? { category_id } : {}),
      ...(product_id ? { product_id } : {}),
      ...(customPageSlug ? { customPageSlug } : {}),
      ...(menu_id ? { menu_id } : {}),
      ...(parentId ? { parentId } : {}),
      ...(icon ? { icon } : {}),
    };

    const item = await prismaClient.menuItem.create({
      data: createData,
      include: { children: true },
    });

    return item;
  }
}