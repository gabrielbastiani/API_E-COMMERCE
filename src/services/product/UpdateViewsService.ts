import { Request } from "express";
import prismaClient from "../../prisma";
import { getClientIp } from "../../middlewares/getClientIp";

function normalizeIp(ip: string): string {
    if (ip === '::1') return '127.0.0.1';
    return ip.split(':').pop() || ip; // Remove prefixos IPv6
}

class UpdateViewsService {
    async execute({ product_id, req }: { product_id: string; req: Request }) {
        const rawIp = getClientIp(req);
        const ipAddress = normalizeIp(rawIp);

        // Verificação simultânea de existência e atualização
        const [existingView, updatedPost] = await prismaClient.$transaction([
            prismaClient.productView.findFirst({
                where: {
                    product_id,
                    ipAddress,
                },
            }),
            prismaClient.product.update({
                where: { id: product_id },
                data: { view: { increment: 1 } },
                select: { view: true }
            })
        ]);

        if (existingView) {
            await prismaClient.product.update({
                where: { id: product_id },
                data: { view: { decrement: 1 } }, // Reverte o incremento
            });
            return { message: "View already counted" };
        }

        await prismaClient.productView.create({
            data: {
                product_id,
                ipAddress,
            },
        });

        return {
            message: "View successfully counted",
            views: updatedPost.view
        };
    }
}

export { UpdateViewsService };