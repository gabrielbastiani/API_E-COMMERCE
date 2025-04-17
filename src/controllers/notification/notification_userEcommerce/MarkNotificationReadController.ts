import { Request, Response } from 'express'
import { MarkNotificationReadService } from '../../../services/notification/notification_userEcommerce/MarkNotificationReadService'; 

class MarkNotificationReadController {
    async handle(req: Request, res: Response) {

        const notificationUserEcommerce_id = req.query.notificationUserEcommerce_id as string;

        const notifications = new MarkNotificationReadService();

        const noti_user = await notifications.execute({ notificationUserEcommerce_id });

        res.json(noti_user);

    }
}

export { MarkNotificationReadController }