import { Request, Response } from 'express'
import { MarkAllNotificationsAsReadService } from '../../../services/notification/notification_userEcommerce/MarkAllNotificationsAsReadService';

class MarkAllNotificationsAsReadController {
    async handle(req: Request, res: Response) {

        const userEcommerce_id = req.query.userEcommerce_id as string;

        const notifications = new MarkAllNotificationsAsReadService();

        const noti_user = await notifications.execute({ userEcommerce_id });

        res.json(noti_user);

    }
}

export { MarkAllNotificationsAsReadController }