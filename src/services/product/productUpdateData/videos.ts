/**
 * Remove todos os productVideo e recria a lista enviada.
 * - prisma: transaction client
 * - productId: id do produto
 * - videoLinks: array de urls (strings)
 */
export async function handleProductVideos(prisma: any, productId: string, videoLinks?: string[]) {
    if (!videoLinks) return;
    await prisma.productVideo.deleteMany({ where: { product_id: productId } });
    const vids = videoLinks.filter((u) => typeof u === "string" && u.startsWith("http"));
    if (vids.length) {
        await prisma.productVideo.createMany({
            data: vids.map((url: string, i: number) => ({
                product_id: productId,
                url,
                isPrimary: i === 0,
            })),
        });
    }
}

/**
 * Remove e recria vídeos de variante
 */
export async function handleVariantVideos(prisma: any, variantId: string, variantVideos?: string[]) {
    await prisma.productVariantVideo.deleteMany({ where: { productVariant_id: variantId } });
    const vids = (variantVideos ?? []).filter((u) => typeof u === "string" && u.startsWith("http"));
    if (vids.length) {
        await prisma.productVariantVideo.createMany({
            data: vids.map((url: string, i: number) => ({
                productVariant_id: variantId,
                url,
                isPrimary: i === 0,
            })),
        });
    }
}