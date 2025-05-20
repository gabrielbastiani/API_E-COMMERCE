import { Request, Response } from "express";
import { CreateProductService } from "../../services/product/CreateProductService";

class CreateProductController {
    async handle(req: Request, res: Response) {
        try {
            const { body, files } = req;

            // Processar arquivos
            const processFiles = (field: string) => {
                return (files as any)[field]?.map((f: Express.Multer.File) => ({
                    url: f.filename,
                    altText: f.originalname,
                    isPrimary: false
                })) || [];
            };

            // Converter campos JSON
            const parseJsonField = (field: string) => {
                return body[field] ? JSON.parse(body[field]) : [];
            };

            const productData = {
                ...body,
                price_of: body.price_of ? Number(body.price_of) : undefined,
                price_per: Number(body.price_per),
                weight: body.weight ? Number(body.weight) : undefined,
                length: body.length ? Number(body.length) : undefined,
                width: body.width ? Number(body.width) : undefined,
                height: body.height ? Number(body.height) : undefined,
                stock: body.stock ? Number(body.stock) : undefined,
                categoryIds: parseJsonField('categoryIds'),
                descriptions: parseJsonField('descriptions'),
                variants: parseJsonField('variants'),
                relations: parseJsonField('relations'),
                keywords: parseJsonField('keywords'),
                images: processFiles('images'),
                videos: processFiles('videos'),
            };

            const service = new CreateProductService();
            const product = await service.execute(productData);

            res.status(201).json(product);

        } catch (error: any) {
            console.error(error);
            res.status(500).json({
                error: "Erro ao criar produto",
                details: error.message
            });
        }
    }
}

export { CreateProductController };