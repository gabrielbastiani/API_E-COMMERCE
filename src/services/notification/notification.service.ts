import prisma from '../../prisma';
import { NotificationType } from '@prisma/client';

export type CreateCustomerNotificationDTO = {
  customerId: string | null;
  type?: NotificationType | string;
  message: string;
  link?: string | null;
};

export type CreateUserNotificationDTO = {
  userEcommerceId: string | null;
  type?: NotificationType | string;
  message: string;
  link?: string | null;
};

export class NotificationService {
  /**
   * Create notification for a customer
   */
  static async createForCustomer(dto: CreateCustomerNotificationDTO) {
    const { customerId, type = 'ORDER', message, link = null } = dto;

    const created = await prisma.notificationCustomer.create({
      data: {
        customer_id: customerId ?? null,
        type: (type as NotificationType) ?? 'INDEFINIDO',
        message: message.slice(0, 500),
        link,
      }
    });

    return created;
  }

  /**
   * Create notification for an e-commerce user (CMS)
   */
  static async createForUser(dto: CreateUserNotificationDTO) {
    const { userEcommerceId, type = 'ORDER', message, link = null } = dto;

    const created = await prisma.notificationUserEcommerce.create({
      data: {
        userEcommerce_id: userEcommerceId ?? null,
        type: (type as NotificationType) ?? 'INDEFINIDO',
        message: message.slice(0, 500),
        link
      }
    });

    return created;
  }

  /**
   * Helper: create notifications for order stakeholders (customer + cms users)
   */
  static async createForOrderStakeholders(params: {
    orderId: string;
    customerId?: string;
    cmsUserIds?: string[]; // users to notify in CMS
    message: string;
    type?: NotificationType | string;
    link?: string;
  }) {
    const { customerId, cmsUserIds = [], message, type = 'ORDER', link = null } = params;

    return await prisma.$transaction(async (tx) => {
      const ops: Promise<any>[] = [];

      if (customerId) {
        ops.push(tx.notificationCustomer.create({
          data: {
            customer_id: customerId,
            type: (type as NotificationType),
            message,
            link
          }
        }));
      }

      for (const uid of cmsUserIds) {
        ops.push(tx.notificationUserEcommerce.create({
          data: {
            userEcommerce_id: uid,
            type: (type as NotificationType),
            message,
            link
          }
        }));
      }

      const results = await Promise.all(ops);
      return results;
    });
  }

  /* ---- Listing / counts / read / delete ---- */

  static async listCustomerNotifications(customerId: string, page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const total = await prisma.notificationCustomer.count({
      where: { customer_id: customerId }
    });

    const data = await prisma.notificationCustomer.findMany({
      where: { customer_id: customerId },
      orderBy: { created_at: 'desc' },
      skip,
      take: perPage
    });

    return { total, page, perPage, data };
  }

  static async listUserNotifications(userId: string, page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const total = await prisma.notificationUserEcommerce.count({
      where: { userEcommerce_id: userId }
    });

    const data = await prisma.notificationUserEcommerce.findMany({
      where: { userEcommerce_id: userId },
      orderBy: { created_at: 'desc' },
      skip,
      take: perPage
    });

    return { total, page, perPage, data };
  }

  static async markCustomerAsRead(notificationId: string) {
    return await prisma.notificationCustomer.update({
      where: { id: notificationId },
      data: { read: true }
    });
  }

  static async markUserAsRead(notificationId: string) {
    return await prisma.notificationUserEcommerce.update({
      where: { id: notificationId },
      data: { read: true }
    });
  }

  static async markAllCustomerAsRead(customerId: string) {
    return await prisma.notificationCustomer.updateMany({
      where: { customer_id: customerId, read: false },
      data: { read: true }
    });
  }

  static async markAllUserAsRead(userEcommerceId: string) {
    return await prisma.notificationUserEcommerce.updateMany({
      where: { userEcommerce_id: userEcommerceId, read: false },
      data: { read: true }
    });
  }

  static async unreadCountCustomer(customerId: string) {
    const count = await prisma.notificationCustomer.count({
      where: { customer_id: customerId, read: false }
    });
    return count;
  }

  static async unreadCountUser(userEcommerceId: string) {
    const count = await prisma.notificationUserEcommerce.count({
      where: { userEcommerce_id: userEcommerceId, read: false }
    });
    return count;
  }

  static async deleteCustomerNotification(notificationId: string) {
    return await prisma.notificationCustomer.delete({
      where: { id: notificationId }
    });
  }

  static async deleteUserNotification(notificationId: string) {
    return await prisma.notificationUserEcommerce.delete({
      where: { id: notificationId }
    });
  }
}