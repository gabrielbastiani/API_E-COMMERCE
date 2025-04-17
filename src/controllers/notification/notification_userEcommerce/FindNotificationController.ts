import { Request, Response } from 'express'
import { FindNotificationService } from '../../../services/notification/notification_userEcommerce/FindNotificationService'; 

class FindNotificationController {
    async handle(req: Request, res: Response) {

        const userEcommerce_id = req.query.userEcommerce_id as string;

        const notifications = new FindNotificationService();

        const noti_user = await notifications.execute({ userEcommerce_id });

        res.json(noti_user);

    }
}

export { FindNotificationController }