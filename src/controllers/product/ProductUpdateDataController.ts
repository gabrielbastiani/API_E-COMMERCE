import { Request, Response } from "express";
import { ProductUpdateDataService } from "../../services/product/ProductUpdateDataService";
import { StatusVariant, ProductRelationType } from "@prisma/client";
import path from "path";
import { unlink } from "fs/promises";

type FileMap = {
    [key: string]: Express.Multer.File[];
};

interface ProcessedVariant {
    id?: string;
    sku: string;
    price_per: number;
    price_of?: number;
    stock: number;
    allowBackorders: boolean;
    sortOrder: number;
    ean?: string;
    mainPromotion_id?: string;
    status?: StatusVariant;
    existingImages: string[];
    newImages: Express.Multer.File[];
    attributes: {
        key: string;
        value: string;
        existingImages: string[];
        newImages: Express.Multer.File[];
    }[];
}

class ProductUpdateDataController {
    private service = new ProductUpdateDataService();

    private parseJSONField<T>(field: any, defaultValue: T): T {
        try {
            return typeof field === "string" ? JSON.parse(field) : field || defaultValue;
        } catch (error) {
            console.error(`Error parsing field: ${error}`);
            return defaultValue;
        }
    }

    private parseStatus(status?: string): StatusVariant | undefined {
        if (!status) return undefined;
        return Object.values(StatusVariant).includes(status as StatusVariant)
            ? status as StatusVariant
            : undefined;
    }

    private processVariantFiles(files: Express.Multer.File[]): ProcessedVariant[] {
        const variantsMap: Record<string, ProcessedVariant> = {};

        files.forEach((file) => {
            const [prefix, variantIndex, attributeIndex] = file.originalname.split("___")[0].split("-");
            
            if (!variantsMap[variantIndex]) {
                variantsMap[variantIndex] = {
                    sku: "",
                    price_per: 0,
                    stock: 0,
                    allowBackorders: false,
                    sortOrder: 0,
                    existingImages: [],
                    newImages: [],
                    attributes: [],
                };
            }

            switch (prefix) {
                case "variant":
                    variantsMap[variantIndex].newImages.push(file);
                    break;
                case "attribute":
                    if (attributeIndex !== undefined) {
                        const attrIndex = parseInt(attributeIndex);
                        if (!variantsMap[variantIndex].attributes[attrIndex]) {
                            variantsMap[variantIndex].attributes[attrIndex] = {
                                key: "",
                                value: "",
                                existingImages: [],
                                newImages: [],
                            };
                        }
                        variantsMap[variantIndex].attributes[attrIndex].newImages.push(file);
                    }
                    break;
            }
        });

        return Object.values(variantsMap);
    }

    private async cleanupTempFiles(files: Express.Multer.File[]) {
        await Promise.all(
            files.map(async (file) => {
                try {
                    await unlink(path.resolve(file.path));
                } catch (error) {
                    console.error(`Error deleting temp file ${file.path}:`, error);
                }
            })
        );
    }

    async handle(req: Request, res: Response): Promise<void> {
        let tempFiles: Express.Multer.File[] = [];

        try {
            const files = req.files as FileMap || {};
            const body = req.body;

            // Processar arquivos principais
            const mainImages = files["imageFiles"] || [];
            tempFiles = [...mainImages];

            // Processar variantes e atributos
            const variantFiles = files["variantImageFiles"] || [];
            const processedVariants = this.processVariantFiles(variantFiles);

            // Parse dos dados
            const variants: ProcessedVariant[] = this.parseJSONField<ProcessedVariant[]>(
                body.variants,
                []
            ).map((v, index) => ({
                ...v,
                status: this.parseStatus(v.status),
                ...processedVariants[index],
                attributes: v.attributes?.map((attr, attrIndex) => ({
                    ...attr,
                    ...processedVariants[index]?.attributes[attrIndex],
                })) || [],
            }));

            // Construir DTO de atualização
            const updateData = {
                id: body.id,
                name: body.name,
                slug: body.slug,
                metaTitle: body.metaTitle,
                metaDescription: body.metaDescription,
                keywords: this.parseJSONField(body.keywords, []),
                brand: body.brand,
                ean: body.ean,
                description: body.description,
                skuMaster: body.skuMaster,
                price_per: parseFloat(body.price_per),
                price_of: body.price_of ? parseFloat(body.price_of) : undefined,
                weight: body.weight ? parseFloat(body.weight) : undefined,
                length: body.length ? parseFloat(body.length) : undefined,
                width: body.width ? parseFloat(body.width) : undefined,
                height: body.height ? parseFloat(body.height) : undefined,
                stock: body.stock ? parseInt(body.stock) : undefined,
                status: this.parseStatus(body.status),
                mainPromotion_id: body.mainPromotion_id,
                categoryIds: this.parseJSONField<string[]>(body.categoryIds, []),
                descriptionBlocks: this.parseJSONField<Array<{ title: string; description: string }>>(
                    body.descriptionBlocks,
                    []
                ),
                existingImages: this.parseJSONField<string[]>(body.existingImages, []),
                newImages: mainImages,
                variants: variants,
                relations: this.parseJSONField<Array<{
                    parentId?: string;
                    childId?: string;
                    relationType: ProductRelationType;
                    sortOrder: number;
                    isRequired: boolean;
                }>>(body.relations, []).map(rel => ({
                    ...rel,
                    relationType: rel.relationType as ProductRelationType
                })),
            };

            if (!updateData.id) {
                res.status(400).json({ error: "Product ID is required" });
                return;
            }

            const updatedProduct = await this.service.execute(updateData);
            await this.cleanupTempFiles(tempFiles);

            res.json(updatedProduct);
        } catch (error: any) {
            console.error("Update error:", error);
            await this.cleanupTempFiles(tempFiles);

            res.status(500).json({
                error: error.message || "Failed to update product",
                details: process.env.NODE_ENV === "development" ? error.stack : undefined,
            });
        }
    }
}

export { ProductUpdateDataController };