import { Request, Response } from "express";
import { CreateProductService } from "../../services/product/CreateProductService";
import { NotificationType, ProductRelationType, Role } from "@prisma/client";
import prismaClient from "../../prisma";

class CreateProductController {
    async handle(req: Request, res: Response) {
        try {
            // Recebe todos os arquivos via multer
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            const { userEcommerce_id } = req.body;

            // Função para parsear JSONs que podem vir como string ou array
            const safeParse = (raw?: any) => {
                if (raw === undefined || raw === null) return [];
                if (typeof raw === 'string') {
                    try {
                        return JSON.parse(raw);
                    } catch (e) {
                        console.error('Erro ao parsear JSON:', raw);
                        return [];
                    }
                }
                return Array.isArray(raw) ? raw : [];
            };

            // Parse das variantes (que podem vir como string JSON ou já como objeto)
            const variants = safeParse(req.body.variants).map((variant: any) => ({
                ...variant,
                videoLinks: safeParse(variant.videoLinks).filter((url: any) => typeof url === 'string'),
                attributes: Array.isArray(variant.attributes)
                    ? variant.attributes.map((attr: any) => ({
                        ...attr,
                        images: safeParse(attr.images),
                        primaryAttributeImageName: attr.primaryAttributeImageName
                    }))
                    : []
            }));

            // Parse das relações
            const rawRelations = safeParse(req.body.relations) as any[];
            const relations = rawRelations.map((r) => ({
                relationDirection: r.relationDirection as "child" | "parent",
                relatedProductId: r.relatedProductId as string,
                relationType: r.relationType as ProductRelationType,
                sortOrder: r.sortOrder ? Number(r.sortOrder) : undefined,
                isRequired: !!r.isRequired,
            }));

            const buyTogether_id = req.body.buyTogether_id || null;

            // Montagem do objeto productData
            const productData = {
                name: req.body.name,
                slug: req.body.slug, // opcional
                metaTitle: req.body.metaTitle,
                metaDescription: req.body.metaDescription,
                keywords: safeParse(req.body.keywords),
                brand: req.body.brand,
                ean: req.body.ean,
                description: req.body.description,
                skuMaster: req.body.skuMaster,
                price_of: Number(req.body.price_of),
                price_per: Number(req.body.price_per),
                weight: req.body.weight ? Number(req.body.weight) : undefined,
                length: req.body.length ? Number(req.body.length) : undefined,
                width: req.body.width ? Number(req.body.width) : undefined,
                height: req.body.height ? Number(req.body.height) : undefined,
                stock: req.body.stock ? Number(req.body.stock) : undefined,
                status: req.body.status, // se não vier, o serviço define default
                mainPromotion_id: req.body.mainPromotion_id,
                videoLinks: safeParse(req.body.videoLinks).filter((url: any) => typeof url === 'string'),
                categories: safeParse(req.body.categories),
                descriptions: safeParse(req.body.productDescriptions),
                // Aqui já passamos as variantes com suas imagens e primaryImageName
                variants: variants,
                relations: relations,
                // Nova propriedade: nome da imagem principal do produto
                primaryMainImageName: req.body.primaryMainImageName,
                buyTogether_id,
            };

            const createProductService = new CreateProductService();
            const product = await createProductService.execute(productData, files);

            // Notificação de criação para administradores e superadministradores
            const user_data = await prismaClient.userEcommerce.findUnique({
                where: { id: userEcommerce_id }
            });

            const users_superAdmins = await prismaClient.userEcommerce.findMany({
                where: { role: Role.SUPER_ADMIN }
            });

            const users_admins = await prismaClient.userEcommerce.findMany({
                where: { role: Role.ADMIN }
            });

            const all_user_ids = [
                ...users_superAdmins.map(userEcommerce => userEcommerce.id),
                ...users_admins.map(userEcommerce => userEcommerce.id)
            ];

            const notificationsData = all_user_ids.map(userEcommerce_id => ({
                userEcommerce_id,
                message: `Produto ${productData?.name} criado pelo usuário ${user_data?.name}.`,
                type: NotificationType.PRODUCT
            }));

            await prismaClient.notificationUserEcommerce.createMany({
                data: notificationsData
            });

            res.json(product);
            
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

export { CreateProductController };