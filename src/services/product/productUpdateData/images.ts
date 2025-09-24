import { IMAGES_DIR, removeFilesFromDisk } from "./utils";
/**
 * Lida com imagens principais do produto:
 * - delete das removidas (FS + DB)
 * - createMany das novas (files param)
 * - re-fetch e marcação da imagem primary (id ou name)
 *
 * Parámetros:
 * - prisma: transaction client
 * - productId: id do produto
 * - incomingFiles: Express.Multer.File[] (novos arquivos enviados)
 * - existingImages: string[] | undefined (ids que frontend quer manter) — se undefined -> mantém tudo
 * - primaryMainImageId: string | undefined
 * - primaryMainImageName: string | undefined
 */
export async function handleProductImages(
    prisma: any,
    productId: string,
    incomingFiles: Express.Multer.File[] = [],
    existingImages?: string[],
    primaryMainImageId?: string,
    primaryMainImageName?: string
) {
    // 5.1) busca todas as imagens atuais
    const allMain = await prisma.productImage.findMany({ where: { product_id: productId } });

    // 5.2) decide quais manter
    const keepIdsMain = Array.isArray(existingImages) ? existingImages : allMain.map((i: { id: any; }) => i.id);

    // 5.3) remove do disco & db os que nao estao em keep
    const toDelete = allMain.filter((img: { id: any; }) => !keepIdsMain.includes(img.id));
    const deleteIds = toDelete.map((i: { id: any; }) => i.id);
    const filePathsToDelete = toDelete.map((img: { url: any; }) => `${IMAGES_DIR}/${img.url}`);
    removeFilesFromDisk(filePathsToDelete);

    if (deleteIds.length) {
        await prisma.productImage.deleteMany({ where: { id: { in: deleteIds } } });
    }

    // 5.4) cria novas imagens (isPrimary = false)
    const newMainData = incomingFiles.map((f) => ({
        product_id: productId,
        url: pathBasename(f.path),
        altText: f.originalname,
        isPrimary: false,
    }));
    if (newMainData.length) {
        await prisma.productImage.createMany({ data: newMainData });
    }

    // 5.5) re-busca todas as imagens
    const updatedAllMain = await prisma.productImage.findMany({ where: { product_id: productId } });

    // 5.6) zera todos os isPrimary (defensivo)
    await prisma.productImage.updateMany({ where: { product_id: productId }, data: { isPrimary: false } });

    // 5.7 / 5.8 marca primary (updateMany para evitar P2025)
    if (primaryMainImageId) {
        await prisma.productImage.updateMany({
            where: { id: primaryMainImageId, product_id: productId },
            data: { isPrimary: true },
        });
    } else if (primaryMainImageName) {
        const match = updatedAllMain.find((img: any) => img.altText === primaryMainImageName);
        if (match) {
            await prisma.productImage.updateMany({
                where: { id: match.id, product_id: productId },
                data: { isPrimary: true },
            });
        }
    }
}

// small helper for path.basename without importing path in many files
function pathBasename(p: string) {
    return p.split(/[\\/]/).pop() ?? p;
}