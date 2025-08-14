import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
}

export const getProductReviewSummary = async (product_id: string): Promise<ReviewSummary> => {
  // Buscar todas as reviews aprovadas para o produto
  const reviews = await prisma.review.findMany({
    where: {
      product_id: product_id,
      status: 'APPROVED' // Considerar apenas as aprovadas
    }
  });

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0
    };
  }

  // Mapear o enum Rating para valores numéricos
  const ratingValues = reviews.map(review => {
    switch (review.rating) {
      case 'ONE': return 1;
      case 'TWO': return 2;
      case 'THREE': return 3;
      case 'FOUR': return 4;
      case 'FIVE': return 5;
      default: return 0;
    }
  });

  // Calcular média
  const totalRating = ratingValues.reduce((sum: any, value) => sum + value, 0);
  const averageRating = totalRating / reviews.length;

  return {
    averageRating,
    totalReviews: reviews.length
  };
};