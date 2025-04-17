import { Request, Response } from 'express';
import { NewsletterCreateService } from '../../services/newsletter/NewsletterCreateService'; 

class NewsletterCreateController {
    async handle(req: Request, res: Response) {
        const {
            email_user
        } = req.body;

        const create_news = new NewsletterCreateService();

        const news = await create_news.execute({
            email_user
        });

        res.json(news)

    }
}

export { NewsletterCreateController }