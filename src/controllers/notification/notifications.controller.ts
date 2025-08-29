import { Request, Response } from 'express';
import { NotificationService } from '../../services/notification/notification.service';

export class NotificationsController {
  static async createForCustomer(req: Request, res: Response) {
    try {
      const { customerId, type, message, link } = req.body;
      if (!message) return res.status(400).json({ error: 'message is required' });

      const created = await NotificationService.createForCustomer({
        customerId: customerId ?? null,
        type,
        message,
        link
      });

      return res.status(201).json(created);
    } catch (err) {
      console.error('createForCustomer error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async createForUser(req: Request, res: Response) {
    try {
      const { userEcommerceId, type, message, link } = req.body;
      if (!message) return res.status(400).json({ error: 'message is required' });

      const created = await NotificationService.createForUser({
        userEcommerceId: userEcommerceId ?? null,
        type,
        message,
        link
      });

      return res.status(201).json(created);
    } catch (err) {
      console.error('createForUser error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async listCustomerNotifications(req: Request, res: Response) {
    try {
      const customerId = req.params.customerId;
      const page = Number(req.query.page || 1);
      const perPage = Number(req.query.perPage || 20);

      const result = await NotificationService.listCustomerNotifications(customerId, page, perPage);
      return res.json(result);
    } catch (err) {
      console.error('listCustomerNotifications error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async listUserNotifications(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const page = Number(req.query.page || 1);
      const perPage = Number(req.query.perPage || 20);

      const result = await NotificationService.listUserNotifications(userId, page, perPage);
      return res.json(result);
    } catch (err) {
      console.error('listUserNotifications error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async markCustomerAsRead(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const updated = await NotificationService.markCustomerAsRead(id);
      return res.json(updated);
    } catch (err) {
      console.error('markCustomerAsRead error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async markUserAsRead(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const updated = await NotificationService.markUserAsRead(id);
      return res.json(updated);
    } catch (err) {
      console.error('markUserAsRead error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async markAllCustomerAsRead(req: Request, res: Response) {
    try {
      const customerId = req.params.customerId;
      const result = await NotificationService.markAllCustomerAsRead(customerId);
      return res.json({ updated: result.count });
    } catch (err) {
      console.error('markAllCustomerAsRead error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async markAllUserAsRead(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const result = await NotificationService.markAllUserAsRead(userId);
      return res.json({ updated: result.count });
    } catch (err) {
      console.error('markAllUserAsRead error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async unreadCountCustomer(req: Request, res: Response) {
    try {
      const customerId = req.params.customerId;
      const count = await NotificationService.unreadCountCustomer(customerId);
      return res.json({ unread: count });
    } catch (err) {
      console.error('unreadCountCustomer error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async unreadCountUser(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const count = await NotificationService.unreadCountUser(userId);
      return res.json({ unread: count });
    } catch (err) {
      console.error('unreadCountUser error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async deleteCustomerNotification(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await NotificationService.deleteCustomerNotification(id);
      return res.status(204).send();
    } catch (err) {
      console.error('deleteCustomerNotification error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  static async deleteUserNotification(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await NotificationService.deleteUserNotification(id);
      return res.status(204).send();
    } catch (err) {
      console.error('deleteUserNotification error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }
}