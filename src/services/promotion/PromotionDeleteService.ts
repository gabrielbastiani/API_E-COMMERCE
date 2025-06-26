import prismaClient from "../../prisma";
import fs from "fs";
import path from "path";

export class PromotionDeleteService {
  async execute(id_delete: string[]): Promise<void> {
    if (!Array.isArray(id_delete) || id_delete.length === 0) {
      return;
    }

    const imagesDir = path.join(process.cwd(), "images");

    // 1) Busca badges para remoção de arquivos
    const badges = await prismaClient.promotionBadge.findMany({
      where: { promotion_id: { in: id_delete } },
      select: { id: true, imageUrl: true },
    });

    // 2) Remove arquivos de badge do disco
    for (const { imageUrl } of badges) {
      const filePath = path.join(imagesDir, imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 3) Executa tudo dentro de uma transação
    await prismaClient.$transaction(async (prisma) => {
      // 3.1) Badges
      await prisma.promotionBadge.deleteMany({
        where: { promotion_id: { in: id_delete } },
      });

      // 3.2) Cupões
      await prisma.coupon.deleteMany({
        where: { promotion_id: { in: id_delete } },
      });

      // 3.3) Condições, Ações, Displays e Usos
      await Promise.all([
        prisma.promotionCondition.deleteMany({ where: { promotion_id: { in: id_delete } } }),
        prisma.promotionAction.deleteMany({ where: { promotion_id: { in: id_delete } } }),
        prisma.promotionDisplay.deleteMany({ where: { promotion_id: { in: id_delete } } }),
        prisma.promotionUsage.deleteMany({ where: { promotion_id: { in: id_delete } } }),
      ]);

      // 3.4) Limpa relações N–N (produtos, variantes, destaques, categorias, pedidos, mainVariants)
      for (const pid of id_delete) {
        await prisma.promotion.update({
          where: { id: pid },
          data: {
            products: { set: [] },
            variantPromotions: { set: [] },
            featuredProducts: { set: [] },
            categories: { set: [] },
            orders: { set: [] },
            mainVariants: { set: [] },
          },
        });
      }

      // 3.5) Deleta promoções
      await prisma.promotion.deleteMany({
        where: { id: { in: id_delete } },
      });
    });
  }
}