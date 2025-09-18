import { Request, Response } from "express";
import * as service from "../../../../services/users/customers/orders/commentOrder.service";

/**
 * GET /customer/orders/:orderId/comments
 */
export async function getOrderComments(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const customerId = (req as any).customer_id;
    if (!customerId) res.status(401).json({ message: "Não autenticado" });

    const comments = await service.getCommentsByOrderForCustomer(orderId, customerId);
    res.json({ data: comments });
  } catch (err: any) {
    console.error("getOrderComments error:", err);
    if (res.headersSent) return;
    const status = err?.status ?? 500;
    const message = err?.message ?? "Erro ao obter comentários";
    res.status(status).json({ message });
  }
}

/**
 * POST /customer/orders/:orderId/comments
 * multipart/form-data -> fields: message, files[] (opcional)
 */
export async function postOrderComment(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const message = (req.body?.message ?? "").trim();
    const customerId = (req as any).customer_id;
    if (!customerId) res.status(401).json({ message: "Não autenticado" });
    if (!message) res.status(400).json({ message: "Mensagem inválida" });

    // create comment
    const created = await service.createCommentByCustomer(orderId, customerId, message);

    // handle files (Multer populates req.files)
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      // prepare attachments payload and save DB records
      const attachPayload = files.map((f) => ({
        url: `/uploads/comments/${f.filename}`, // servir estático esta rota (veja Observações)
        filename: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      }));
      await service.addAttachmentsToComment(created.id, attachPayload);
    }

    const comments = await service.getCommentsByOrderForCustomer(orderId, customerId);
    res.status(201).json({ data: created, conversation: comments });
  } catch (err: any) {
    console.error("postOrderComment error:", err);
    if (res.headersSent) return;
    const status = err?.status ?? 500;
    const message = err?.message ?? "Erro ao criar comentário";
    res.status(status).json({ message });
  }
}