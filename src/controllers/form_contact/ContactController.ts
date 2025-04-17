import { Request, Response } from 'express'
import { ContactService } from '../../services/form_contact/ContactService'; 

class ContactController {
    async handle(req: Request, res: Response) {

        const formContact_id = req.query.formContact_id as string;

        const detail_contact = new ContactService();

        const contact = await detail_contact.execute({ formContact_id });

        res.json(contact);

    }
}

export { ContactController }