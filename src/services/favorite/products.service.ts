import prisma from "../../prisma";

export type ProductFull = any; // pode criar tipos mais estritos conforme desejar

class ProductsService {
  /**
   * Busca múltiplos produtos por um array de ids.
   * Retorna produtos com includes importantes: images, variants, variant attributes, promotions, categories...
   */
  async getProductsByIds(ids: string[]): Promise<ProductFull[]> {
    if (!ids || ids.length === 0) return [];

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        images: true,
        videos: true,
        categories: {
          include: {
            category: true,
          },
        },
        mainPromotion: {
          include: {
            badges: true,
            actions: true,
            conditions: true,
            displays: true,
            coupons: true,
          },
        },
        variants: {
          include: {
            variantAttribute: {
              include: {
                variantAttributeImage: true,
              },
            },
            productVariantImage: true,
            productVariantVideo: true,
            mainPromotion: {
              include: {
                badges: true,
                actions: true,
                conditions: true,
                displays: true,
                coupons: true,
              },
            },
            promotions: true,
          },
        },
        productView: true,
        productsDescriptions: true,
        productRelations: true,
        parentRelations: true,
        childRelations: true
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // converter datas / objetos não serializáveis em JSON-friendly
    return JSON.parse(JSON.stringify(products));
  }

  /**
   * Busca um produto por id com os mesmos includes
   */
  async getProductById(id: string): Promise<ProductFull | null> {
    if (!id) return null;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        videos: true,
        categories: {
          include: {
            category: true,
          },
        },
        mainPromotion: {
          include: {
            badges: true,
            actions: true,
            conditions: true,
            displays: true,
            coupons: true,
          },
        },
        variants: {
          include: {
            variantAttribute: {
              include: {
                variantAttributeImage: true,
              },
            },
            productVariantImage: true,
            productVariantVideo: true,
            mainPromotion: {
              include: {
                badges: true,
                actions: true,
                conditions: true,
                displays: true,
                coupons: true,
              },
            },
            promotions: true,
          },
        },
        productView: true,
        productsDescriptions: true,
        productRelations: true,
        parentRelations: true,
        childRelations: true,
      },
    });

    return product ? JSON.parse(JSON.stringify(product)) : null;
  }
}

export const productsService = new ProductsService();
export default productsService;