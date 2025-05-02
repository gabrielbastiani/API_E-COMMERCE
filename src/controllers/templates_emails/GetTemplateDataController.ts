import { Request, Response } from 'express';
import { GetTemplateDataService } from '../../services/templates_emails/GetTemplateDataService';

class GetTemplateDataController {
    async handle(req: Request, res: Response) {
        const emailTemplate_id = req.query.emailTemplate_id as string;

        const formContactDeleteService = new GetTemplateDataService();

        const dataTemplate = await formContactDeleteService.execute({
            emailTemplate_id
        });

        res.json(dataTemplate);
    }
}

export { GetTemplateDataController };