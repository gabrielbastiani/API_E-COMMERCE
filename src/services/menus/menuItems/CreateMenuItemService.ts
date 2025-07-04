import { Prisma } from "@prisma/client";
import prismaClient from "../../../prisma";

interface CreateMenuItemDTO {
  label: string;
  type: "INTERNAL_LINK" | "EXTERNAL_LINK" | "CATEGORY" | "PRODUCT" | "CUSTOM_PAGE";
  url?: string;
  category_id?: string;
  productId?: string;
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
      productId,
      customPageSlug,
      icon,
      isActive = true,
      order = 0,
      menu_id,
      parentId,
    } = data;

    const createData: Prisma.MenuItemCreateInput = {
      label,
      type,
      isActive,
      order,
      ...(url && { url }),
      // relações
      ...(category_id && {
        category: { connect: { id: category_id } },
      }),
      ...(productId && {
        product: { connect: { id: productId } },
      }),
      ...(customPageSlug && {
        customPage: { connect: { slug: customPageSlug } },
      }),
      ...(menu_id && {
        menu: { connect: { id: menu_id } },
      }),
      ...(parentId && {
        parent: { connect: { id: parentId } },
      }),
      // ícone: só o caminho/nome do arquivo, supondo que multer já salvou em diskStorage
      ...(icon && { icon }),
    };

    const item = await prismaClient.menuItem.create({
      data: createData,
      include: { children: true },
    });

    return item;
  }
}