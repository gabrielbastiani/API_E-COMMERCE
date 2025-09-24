import { slugify } from "./utils";

/**
 * Atualiza os dados básicos do produto.
 * - prisma: instância da transação
 * - id: product id
 * - productData: objeto contendo os campos (name, mainPromotion_id, buyTogether_id, etc)
 */
export async function updateBasicProduct(prisma: any, id: string, productData: any) {
    const {
        name,
        metaTitle,
        metaDescription,
        keywords,
        brand,
        ean,
        description,
        skuMaster,
        price_of,
        price_per,
        weight,
        length,
        width,
        height,
        stock,
        status,
        mainPromotion_id,
        buyTogether_id,
    } = productData;

    const dataToUpdate: Record<string, any> = {
        name,
        slug: name ? slugify(name) : undefined,
        metaTitle,
        metaDescription,
        keywords,
        brand,
        ean,
        description,
        skuMaster,
        price_of,
        price_per,
        weight,
        length,
        width,
        height,
        stock,
        status,
    };

    if (mainPromotion_id === null) {
        dataToUpdate.mainPromotion_id = null;
    } else if (typeof mainPromotion_id === "string" && mainPromotion_id.trim() !== "") {
        dataToUpdate.mainPromotion_id = mainPromotion_id.trim();
    }

    if (buyTogether_id === null) dataToUpdate.buyTogether_id = null;
    else if (typeof buyTogether_id === "string" && buyTogether_id.trim() !== "") {
        dataToUpdate.buyTogether_id = buyTogether_id.trim();
    }

    await prisma.product.update({
        where: { id },
        data: dataToUpdate,
    });
}