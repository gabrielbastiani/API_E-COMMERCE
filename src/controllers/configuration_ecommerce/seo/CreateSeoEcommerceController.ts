import { Request, Response } from 'express';
import { CreateSeoEcommerceService } from '../../../services/configuration_ecommerce/seo/CreateSeoEcommerceService'; 

class CreateSeoEcommerceController {
    async handle(req: Request, res: Response) {
        const {
            page,
            title,
            description,
            keywords,
            ogTitle,
            ogDescription,
            ogImageWidth,
            ogImageHeight,
            ogImageAlt,
            twitterTitle,
            twitterDescription,
            twitterCreator
        } = req.body;

        // Processar imagens do OG
        let ogImagescreate: string[] = [];
        if (req.files && 'ogImages' in req.files) {
            ogImagescreate = req.files['ogImages'].map((file: any) => file.filename);
        }

        // Processar imagens do Twitter
        let imagesTwitter: string[] = [];
        if (req.files && 'twitterImages' in req.files) {
            imagesTwitter = req.files['twitterImages'].map((file: any) => file.filename);
        }

        const create_seo = new CreateSeoEcommerceService();

        const seo = await create_seo.execute({
            page,
            title,
            description,
            keywords: keywords ? JSON.parse(keywords) : [], // Assume que keywords é enviado como JSON string
            ogTitle,
            ogDescription,
            ogImages: ogImagescreate,
            ogImageWidth: ogImageWidth ? Number(ogImageWidth) : undefined,
            ogImageHeight: ogImageHeight ? Number(ogImageHeight) : undefined,
            ogImageAlt,
            twitterTitle,
            twitterDescription,
            twitterCreator,
            twitterImages: imagesTwitter
        });

        res.json(seo);
    }
}

export { CreateSeoEcommerceController };