import { Rating } from "@prisma/client";
import prismaClient from "../../prisma";

interface ReviewProps {
    rating?: string | number;
    comment?: string;
    product_id: string;
    customer_id: string;
    nameCustomer: string;
}

const ratingNumberToEnum = (r?: string | number): Rating | null => {
    if (r == null) return null;
    const n = typeof r === 'number' ? r : Number(r);
    if (!Number.isFinite(n)) {
        // aceitar se já vier como 'ONE'|'TWO'...
        const upper = String(r).toUpperCase();
        if (['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].includes(upper)) {
            return upper as Rating;
        }
        return null;
    }
    switch (n) {
        case 1: return Rating.ONE;
        case 2: return Rating.TWO;
        case 3: return Rating.THREE;
        case 4: return Rating.FOUR;
        case 5: return Rating.FIVE;
        default: return null;
    }
};

class CreateReviewService {
    async execute({ rating, comment, product_id, customer_id, nameCustomer }: ReviewProps) {
        // recomendo validar se product e customer existem (opcional mas evita FK errors)
        // const productExists = await prismaClient.product.findUnique({ where: { id: product_id } });
        // if (!productExists) throw new Error('Produto não encontrado');

        const mapped = ratingNumberToEnum(rating) ?? Rating.ONE; // fallback seguro (ou lançar erro)
        // se preferir forçar validação:
        // if (!mapped) throw new Error('Rating inválido. Deve ser 1-5 ou ONE..FIVE');

        const review = await prismaClient.review.create({
            data: {
                rating: mapped,
                comment: comment ?? null,
                product_id,
                customer_id,
                nameCustomer
            }
        });

        return review;
    }
}

export { CreateReviewService }