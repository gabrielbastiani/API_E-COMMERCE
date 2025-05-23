import { Request, Response } from 'express';
import { FormContactCreateService } from '../../services/form_contact/FormContactCreateService'; 

class FormContactCreateController {
    async handle(req: Request, res: Response) {
        const {
            email_user,
            name_user,
            subject,
            message
        } = req.body;

        const create_form = new FormContactCreateService();

        const form = await create_form.execute({
            email_user,
            name_user,
            subject,
            message
        });

        res.json(form)

    }
}

export { FormContactCreateController }