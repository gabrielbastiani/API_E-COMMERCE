import { NotificationType, Role } from "@prisma/client";
import prismaClient from "../../prisma";
import fs from "fs";
import path from "path";

export class ProductDeleteService {
    async execute(id_delete: string[], name?: string): Promise<void> {
        // Se não vierem IDs, nada a fazer
        if (!Array.isArray(id_delete) || id_delete.length === 0) {
            return;
        }

        const products = await prismaClient.product.findMany({
            where: {
                id: {
                    in: id_delete
                }
            }
        });

        return prismaClient.$transaction(async (prisma) => {
            const imagesDir = path.join(process.cwd(), "images");

            //
            // 1) Imagens de nível “produto”
            //
            const prodImgs = await prisma.productImage.findMany({
                where: { product_id: { in: id_delete } },
                select: { id: true, url: true },
            });
            // Apaga arquivos no disco
            for (const img of prodImgs) {
                const filePath = path.join(imagesDir, img.url);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            // Remove do banco
            await prisma.productImage.deleteMany({
                where: { product_id: { in: id_delete } },
            });

            const productChar = await prisma.productCharacteristics.findMany({
                where: { product_id: { in: id_delete } },
                select: { id: true, image: true },
            });
            // Apaga arquivos no disco
            for (const img of productChar) {/* @ts-ignore */
                const filePath = path.join(imagesDir, img?.image);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            // Remove do banco
            await prisma.productCharacteristics.deleteMany({
                where: { product_id: { in: id_delete } },
            });

            //
            // 2) Vídeos de produto
            //
            await prisma.productVideo.deleteMany({
                where: { product_id: { in: id_delete } },
            });

            //
            // 3) Categorias de produto
            //
            await prisma.productCategory.deleteMany({
                where: { product_id: { in: id_delete } },
            });

            //
            // 4) Descrições de produto
            //
            await prisma.productDescription.deleteMany({
                where: { product_id: { in: id_delete } },
            });

            //
            // 5) Relações que envolvem esses produtos (tanto parent quanto child)
            //
            await prisma.productRelation.deleteMany({
                where: {
                    OR: [
                        { parentProduct_id: { in: id_delete } },
                        { childProduct_id: { in: id_delete } },
                    ],
                },
            });

            //
            // 6) VARIANTES E DADOS ANEXOS
            //
            // 6.1) Pega todas as variantes cuja product_id está em id_delete
            const variants = await prisma.productVariant.findMany({
                where: { product_id: { in: id_delete } },
                select: { id: true },
            });
            const variantIds = variants.map((v) => v.id);
            if (variantIds.length > 0) {
                // 6.2) Vídeos de variante
                await prisma.productVariantVideo.deleteMany({
                    where: { productVariant_id: { in: variantIds } },
                });

                // 6.3) Imagens de variante
                const varImgs = await prisma.productVariantImage.findMany({
                    where: { productVariant_id: { in: variantIds } },
                    select: { id: true, url: true },
                });
                for (const img of varImgs) {
                    const filePath = path.join(imagesDir, img.url);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
                await prisma.productVariantImage.deleteMany({
                    where: { productVariant_id: { in: variantIds } },
                });

                // 6.4) ATRIBUTOS DE VARIANTE E SUAS IMAGENS
                const attrs = await prisma.variantAttribute.findMany({
                    where: { variant_id: { in: variantIds } },
                    select: { id: true },
                });
                const attrIds = attrs.map((a) => a.id);
                if (attrIds.length > 0) {
                    // 6.4.a) Imagens de atributo
                    const attrImgs = await prisma.variantAttributeImage.findMany({
                        where: { variantAttribute_id: { in: attrIds } },
                        select: { id: true, url: true },
                    });
                    for (const img of attrImgs) {
                        const filePath = path.join(imagesDir, img.url);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                    await prisma.variantAttributeImage.deleteMany({
                        where: { variantAttribute_id: { in: attrIds } },
                    });

                    // 6.4.b) Apaga os próprios atributos
                    await prisma.variantAttribute.deleteMany({
                        where: { id: { in: attrIds } },
                    });
                }

                // 6.5) Por fim, apaga as próprias variantes
                await prisma.productVariant.deleteMany({
                    where: { id: { in: variantIds } },
                });
            }

            // Busca de IDs dos usuários SUPER_ADMIN e ADMIN
            const users_superAdmins = await prismaClient.userEcommerce.findMany({
                where: {
                    role: Role.SUPER_ADMIN
                }
            });

            const users_admins = await prismaClient.userEcommerce.findMany({
                where: {
                    role: Role.ADMIN
                }
            });

            const all_user_ids = [
                ...users_superAdmins.map(user => user.id),
                ...users_admins.map(user => user.id)
            ];

            // Criação de notificações para cada categoria deletada e cada usuário
            await prismaClient.notificationUserEcommerce.createMany({
                data: products.flatMap((product) =>
                    all_user_ids.map((userEcommerce_id) => ({
                        userEcommerce_id,
                        message: `Produtos(s) ${product.name} foi deletada(s) pelo usuário ${name}.`,
                        type: NotificationType.PRODUCT
                    }))
                )
            });

            //
            // 7) Finalmente, apaga os próprios produtos
            //
            await prisma.product.deleteMany({
                where: { id: { in: id_delete } },
            });

            // Fim da transação
        });
    }
}