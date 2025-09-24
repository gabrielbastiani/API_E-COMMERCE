/**
 * Lida com relações do produto (update/delete/create).
 */
export async function handleRelations(prisma: any, productId: string, relations?: any[]) {
    if (!relations) return;

    // 7.1 busca IDs atuais
    const existingRelsInDb = await prisma.productRelation.findMany({
        where: {
            OR: [{ parentProduct_id: productId }, { childProduct_id: productId }],
        },
        select: { id: true },
    });
    const existingIdsInDb = existingRelsInDb.map((r: { id: any; }) => r.id);

    // 7.2 IDs vindos no payload (válidos)
    const incomingIds = relations.filter((r) => typeof r.id === "string" && r.id.trim() !== "").map((r) => r.id!) as string[];

    // 7.3 IDs a excluir
    const idsToDelete = existingIdsInDb.filter((dbId: string) => !incomingIds.includes(dbId));
    if (idsToDelete.length) {
        await prisma.productRelation.deleteMany({ where: { id: { in: idsToDelete } } });
    }

    // 7.4 para cada relação do payload, atualiza ou cria
    for (const r of relations) {
        if (!r.relatedProductId || r.relatedProductId.trim() === "") continue;
        const isExisting = typeof r.id === "string" && existingIdsInDb.includes(r.id!);
        const isChild = r.relationDirection === "child";

        if (isExisting) {
            await prisma.productRelation.update({
                where: { id: r.id! },
                data: {
                    relationType: r.relationType,
                    sortOrder: r.sortOrder ?? 0,
                    isRequired: r.isRequired ?? false,
                    parentProduct_id: isChild ? r.relatedProductId : productId,
                    childProduct_id: isChild ? productId : r.relatedProductId,
                },
            });
        } else {
            await prisma.productRelation.create({
                data: {
                    relationType: r.relationType,
                    sortOrder: r.sortOrder ?? 0,
                    isRequired: r.isRequired ?? false,
                    parentProduct: { connect: { id: isChild ? r.relatedProductId : productId } },
                    childProduct: { connect: { id: isChild ? productId : r.relatedProductId } },
                },
            });
        }
    }
}