import { Request, Response } from "express";
import * as service from "../../../services/users/customers/orders/commentOrder.service";

/**
 * GET /admin/orders/:orderId/comments
 */
export async function adminGetOrderComments(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const userEcommerceId = (req as any).userEcommerce_id;
    if (!userEcommerceId) res.status(401).json({ message: "Não autenticado (admin)" });

    const comments = await service.getCommentsByOrderForAdmin(orderId);
    res.json({ data: comments });
  } catch (err: any) {
    console.error("adminGetOrderComments error:", err);
    if (res.headersSent) return;
    const status = err?.status ?? 500;
    const message = err?.message ?? "Erro ao obter comentários (admin)";
    res.status(status).json({ message });
  }
}

/**
 * POST /admin/orders/:orderId/comments
 * multipart/form-data -> fields: message, visible (boolean), assignToOrder (boolean), files[]
 */
export async function adminPostOrderComment(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const message = (req.body?.message ?? "").trim();
    const visible = req.body?.visible === "false" ? false : Boolean(req.body?.visible ?? true);
    const assignToOrder = req.body?.assignToOrder === "true";
    const userEcommerceId = (req as any).userEcommerce_id;
    if (!userEcommerceId) res.status(401).json({ message: "Não autenticado (admin)" });
    if (!message) res.status(400).json({ message: "Mensagem inválida" });

    const created = await service.createCommentByStaff(orderId, userEcommerceId, message, visible, assignToOrder);

    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      const attachPayload = files.map((f) => ({
        url: `/commentAttachment/${f.filename}`,
        filename: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      }));
      await service.addAttachmentsToComment(created.id, attachPayload);
    }

    const comments = await service.getCommentsByOrderForAdmin(orderId);
    res.status(201).json({ data: created, conversation: comments });
  } catch (err: any) {
    console.error("adminPostOrderComment error:", err);
    if (res.headersSent) return;
    const status = err?.status ?? 500;
    const message = err?.message ?? "Erro ao criar comentário (admin)";
    res.status(status).json({ message });
  }
}

/**
 * POST /admin/comments/:commentId/visibility { visible: boolean }
 */
export async function adminSetCommentVisibility(req: Request, res: Response) {
  try {
    const { commentId } = req.params;
    const visible = !!req.body?.visible;
    const userEcommerceId = (req as any).userEcommerce_id;
    if (!userEcommerceId) res.status(401).json({ message: "Não autenticado (admin)" });

    const updated = await service.setCommentVisibility(commentId, userEcommerceId, visible);
    res.json({ data: updated });
  } catch (err: any) {
    console.error("adminSetCommentVisibility error:", err);
    if (res.headersSent) return;
    const status = err?.status ?? 500;
    const message = err?.message ?? "Erro ao atualizar visibilidade do comentário";
    res.status(status).json({ message });
  }
}