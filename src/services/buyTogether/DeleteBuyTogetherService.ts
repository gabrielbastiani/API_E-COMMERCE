import prismaClient from "../../prisma";

interface DeleteBuyTogetherProps {
    id_delete: string[];
}

type DeleteResult = {
    count: number;
};

class DeleteBuyTogetherService {
    async execute({ id_delete }: DeleteBuyTogetherProps): Promise<DeleteResult> {
        return prismaClient.$transaction(async (prisma) => {
            // 1) Desvincula todos os produtos que estão nesses grupos
            await prisma.product.updateMany({
                where: { buyTogether_id: { in: id_delete } },
                data: { buyTogether_id: null },
            });

            // 2) Deleta os grupos propriamente ditos
            const result = await prisma.buyTogether.deleteMany({
                where: { id: { in: id_delete } },
            });

            return result;
        });
    }
}

export { DeleteBuyTogetherService };