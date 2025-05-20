import prismaClient from "../../prisma";
import { StatusProduct, StatusDescriptionProduct, ProductRelationType } from "@prisma/client";

interface IVariantAttribute {
    key: string;
    value: string;
    isPrimaryImage?: boolean;
    attributeImageUrl?: string;
}

interface IVariant {
    mainPromotion_id?: string;
    sku: string;
    price_of?: number;
    price_per: number;
    stock?: number;
    allowBackorders?: boolean;
    ean?: string;
    sortOrder?: number;
    images?: { url: string; altText?: string; isPrimary?: boolean }[];
    videos?: { url: string; isPrimary?: boolean }[];
    attributes?: IVariantAttribute[];
}

interface ICreateProductDTO {
    name: string;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    brand?: string;
    ean?: string;
    description: string;
    mainPromotion_id?: string;
    skuMaster?: string;
    price_of?: number;
    price_per: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    stock?: number;
    status?: StatusProduct;
    categoryIds?: string[];
    images?: { url: string; altText?: string; isPrimary?: boolean }[];
    videos?: { url: string; isPrimary?: boolean }[];
    descriptions?: { title: string; description: string; status?: StatusDescriptionProduct }[];
    variants?: IVariant[];
    relations?: { parentId: string; childId: string; type?: ProductRelationType; sortOrder?: number; isRequired?: boolean }[];
}

class CreateProductService {
    async execute(data: ICreateProductDTO) {
        const processSlug = (name: string) => {
            return name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/[/]/g, "-");
        };

        const createMedia = {
            images: (items: any[], type: string) => items.map((item, index) => ({
                url: item.url,
                altText: item.altText || `${type} ${index + 1}`,
                isPrimary: index === 0
            })),
            videos: (items: any[]) => items.map(video => ({
                url: video.url,
                isPrimary: video.isPrimary ?? false
            }))
        };

        try {
            return await prismaClient.product.create({
                data: {
                    ...data,
                    slug: data.slug || processSlug(data.name), // Usa o slug fornecido ou gera um
                    keywords: data.keywords || [],
                    categories: {
                        create: (data.categoryIds || []).map(id => ({
                            category: { connect: { id } }
                        }))
                    },
                    images: {
                        create: createMedia.images(data.images || [], 'Produto')
                    },
                    videos: {
                        create: createMedia.videos(data.videos || [])
                    },
                    productsDescriptions: {
                        create: (data.descriptions || []).map(desc => ({
                            ...desc,
                            status: desc.status || StatusDescriptionProduct.DISPONIVEL
                        }))
                    },
                    productRelations: {
                        create: (data.relations || []).map(r => ({
                            parentProduct: { connect: { id: r.parentId } },
                            childProduct: { connect: { id: r.childId } },
                            relationType: r.type ?? ProductRelationType.VARIANT,
                            sortOrder: r.sortOrder ?? 0,
                            isRequired: r.isRequired ?? false
                        }))
                    },
                    variants: {
                        create: (data.variants || []).map(variant => ({
                            ...variant,
                            productVariantImage: {
                                create: createMedia.images(variant.images || [], 'Variante')
                            },
                            productVariantVideo: {
                                create: createMedia.videos(variant.videos || [])
                            },
                            variantAttribute: {
                                create: (variant.attributes || []).map(attr => ({
                                    key: attr.key,
                                    value: attr.value,
                                    variantAttributeImage: attr.attributeImageUrl ? {
                                        create: {
                                            url: attr.attributeImageUrl,
                                            altText: `Atributo ${attr.key}`,
                                            isPrimary: attr.isPrimaryImage ?? false
                                        }
                                    } : undefined
                                }))
                            }
                        }))
                    }
                },
                include: {
                    categories: true,
                    images: true,
                    videos: true,
                    productsDescriptions: true,
                    productRelations: true,
                    variants: {
                        include: {
                            productVariantImage: true,
                            productVariantVideo: true,
                            variantAttribute: {
                                include: {
                                    variantAttributeImage: true
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar produto:', error);
            throw new Error('Falha ao cadastrar o produto');
        }
    }
}

export { CreateProductService };