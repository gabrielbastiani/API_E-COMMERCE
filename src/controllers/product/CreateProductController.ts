import { Request, Response } from 'express';
import { CreateProductService } from '../../services/product/CreateProductService';

class CreateProductController {
    async handle(req: Request, res: Response) {
        try {
            // Verificar se os arquivos foram processados corretamente
            const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
            
            // Parse dos dados do corpo da requisição
            const data = JSON.parse(req.body.data);

            // Processar imagens principais
            const mainImages = files?.['images']?.map(file => ({
                url: file.path,
                altText: file.originalname,
                isPrimary: false
            })) || [];

            // Processar variantes com suas imagens
            const processedVariants = data.variants.map((variant: any, index: number) => {
                // Adicione conversão para atributos da variante
                const variantAttributes = variant.variantAttributes?.map((attr: any) => ({
                  key: attr.key,
                  value: attr.value,
                  status: attr.status || 'DISPONIVEL'
                })) || [];

                return {
                    ...variant,
                    variantAttributes,
                    price_per: Number(variant.price_per),
                    price_of: variant.price_of ? Number(variant.price_of) : undefined,
                    stock: variant.stock ? Number(variant.stock) : 0,
                    sortOrder: variant.sortOrder ? Number(variant.sortOrder) : 0
                };
            });

            // Construir o objeto completo do produto
            const productData = {
                ...data,
                images: mainImages,
                variants: processedVariants,
                price_per: Number(data.price_per),
                price_of: data.price_of ? Number(data.price_of) : undefined,
                weight: data.weight ? Number(data.weight) : undefined,
                length: data.length ? Number(data.length) : undefined,
                width: data.width ? Number(data.width) : undefined,
                height: data.height ? Number(data.height) : undefined,
                categories: Array.isArray(data.categories) ? data.categories : [],
                productDescriptions: Array.isArray(data.productDescriptions) ? data.productDescriptions : [],
                productRelations: JSON.parse(data.productRelations || '[]'),
                videos: JSON.parse(data.videos || '[]')
            };

            // Validação de campos obrigatórios
            if (!productData.name || !productData.description || productData.price_per === undefined) {
                res.status(400).json({ error: 'Campos obrigatórios faltando: nome, descrição e preço' });
            }

            const createProductService = new CreateProductService();
            const product = await createProductService.execute(productData);

            res.status(201).json(product);

        } catch (error) {
            console.error('Erro ao criar produto:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
            const errorStack = process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined;
            
            res.status(500).json({
                error: errorMessage,
                ...(errorStack && { stack: errorStack })
            });
        }
    }
}

export { CreateProductController };