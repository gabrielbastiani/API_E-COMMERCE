/**
 * Remove todas as categorias e recria a lista passada.
 */
export async function handleCategories(prisma: any, productId: string, categories?: string[]) {
    if (!categories) return;
    await prisma.productCategory.deleteMany({ where: { product_id: productId } });
    if (categories.length) {
        await prisma.productCategory.createMany({
            data: categories.map((catId: string) => ({
                product_id: productId,
                category_id: catId,
            })),
        });
    }
}