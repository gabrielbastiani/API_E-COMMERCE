import { Router } from "express";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { FindNotificationController } from "../../controllers/notification/notification_userEcommerce/FindNotificationController";
import { MarkNotificationReadController } from "../../controllers/notification/notification_userEcommerce/MarkNotificationReadController";
import { MarkAllNotificationsAsReadController } from "../../controllers/notification/notification_userEcommerce/MarkAllNotificationsAsReadController";
import { FindUsersNotificationController } from "../../controllers/notification/notification_userEcommerce/FindUsersNotificationController";
import { NotificationDeleteController } from "../../controllers/notification/notification_userEcommerce/NotificationDeleteController";

const router = Router();

router.get('/user/userEcommerce/notifications', isAuthenticatedEcommerce, new FindNotificationController().handle);
router.put('/user/notifications/userEcommerce/mark-read', isAuthenticatedEcommerce, new MarkNotificationReadController().handle);
router.put('/user/notifications/userEcommerce/mark-all-read', isAuthenticatedEcommerce, new MarkAllNotificationsAsReadController().handle);
router.get('/user/notifications/userEcommerce/central_notifications', isAuthenticatedEcommerce, new FindUsersNotificationController().handle);
router.delete('/user/notifications/userEcommerce/delete_notification', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new NotificationDeleteController().handle);

export default router;