import { StatusDescriptionProduct } from "@prisma/client";

/**
 * Remove e recria productDescriptions.
 */
export async function handleDescriptions(prisma: any, productId: string, descriptions?: any[]) {
    if (!descriptions) return;
    await prisma.productDescription.deleteMany({ where: { product_id: productId } });
    if (descriptions.length) {
        await prisma.productDescription.createMany({
            data: descriptions.map((d: any) => ({
                product_id: productId,
                title: d.title,
                description: d.description,
                status: d.status ?? StatusDescriptionProduct.DISPONIVEL,
            })),
        });
    }
}