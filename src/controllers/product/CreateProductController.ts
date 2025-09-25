import { Request, Response } from "express";
import { CreateProductService } from "../../services/product/CreateProductService";
import { NotificationType, ProductRelationType, Role } from "@prisma/client";
import prismaClient from "../../prisma";

class CreateProductController {
    async handle(req: Request, res: Response) {
        try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
            const { userEcommerce_id } = req.body;

            const parseMaybeArrayRaw = (raw: any): any[] => {
                if (raw === undefined || raw === null) return [];
                if (Array.isArray(raw)) return raw;
                if (typeof raw === 'string') {
                    try {
                        const parsed = JSON.parse(raw);
                        return Array.isArray(parsed) ? parsed : [parsed];
                    } catch (err) {
                        return [];
                    }
                }
                if (typeof raw === 'object') return [raw];
                return [];
            };

            const safeParse = (raw?: any) => {
                if (raw === undefined || raw === null) return [];
                if (typeof raw === 'string') {
                    try { return JSON.parse(raw); } catch (e) { return []; }
                }
                return Array.isArray(raw) ? raw : [];
            };

            const rawItems = parseMaybeArrayRaw(req.body.characteristics);

            const flattenedItems: any[] = [];
            for (const rawItem of rawItems) {
                if (typeof rawItem === 'string') {
                    try {
                        const parsed = JSON.parse(rawItem);
                        if (Array.isArray(parsed)) {
                            flattenedItems.push(...parsed);
                        } else if (parsed && typeof parsed === 'object') {
                            flattenedItems.push(parsed);
                        }
                    } catch (err) {
                    }
                } else if (Array.isArray(rawItem)) {
                    flattenedItems.push(...rawItem);
                } else if (rawItem && typeof rawItem === 'object') {
                    flattenedItems.push(rawItem);
                }
            }

            const parsedCharacteristics = flattenedItems.map((c: any) => {
                const key = typeof c?.key === 'string' ? String(c.key).trim() : null;
                const value = typeof c?.value === 'string' ? String(c.value).trim() : null;
                const imageName = c?.imageName ?? null;
                return { key, value, imageName };
            });

            const characteristicsFiltered = parsedCharacteristics.filter((c: any) => c.key && c.value);

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

            const rawRelations = safeParse(req.body.relations) as any[];
            const relations = rawRelations.map((r) => ({
                relationDirection: r.relationDirection as "child" | "parent",
                relatedProductId: r.relatedProductId as string,
                relationType: r.relationType as ProductRelationType,
                sortOrder: r.sortOrder ? Number(r.sortOrder) : undefined,
                isRequired: !!r.isRequired,
            }));

            const buyTogether_id = req.body.buyTogether_id || null;

            const productData = {
                name: req.body.name,
                slug: req.body.slug,
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
                status: req.body.status,
                mainPromotion_id: req.body.mainPromotion_id,
                videoLinks: safeParse(req.body.videoLinks).filter((url: any) => typeof url === 'string'),
                categories: safeParse(req.body.categories),
                descriptions: safeParse(req.body.productDescriptions),
                variants,
                relations,
                primaryMainImageName: req.body.primaryMainImageName,
                buyTogether_id,
                characteristics: characteristicsFiltered
            };

            const createProductService = new CreateProductService();
            const product = await createProductService.execute(productData, files);

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

            if (notificationsData.length) {
                await prismaClient.notificationUserEcommerce.createMany({
                    data: notificationsData
                });
            }

            res.json(product);

        } catch (error) {
            console.error('CreateProductController.handle error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

export { CreateProductController };