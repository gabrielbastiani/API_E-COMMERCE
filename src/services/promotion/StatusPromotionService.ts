import { StatusPromotion } from "@prisma/client";
import prismaClient from "../../prisma";

interface PromotionRequest {
    promotion_id: string;
    status?: "Disponivel" | "Indisponivel" | "Programado";
}

class StatusPromotionService {
    async execute({ promotion_id, status }: PromotionRequest) {

        const dataToUpdate: any = {};

        if (status) {
            if (status === "Programado") {
                dataToUpdate.is_completed = false,
                    dataToUpdate.email_sent = false
            }
            dataToUpdate.status = status as StatusPromotion;
        }

        const promotion = await prismaClient.promotion.update({
            where: { id: promotion_id },
            data: dataToUpdate
        });

        return promotion;

    }
}

export { StatusPromotionService }