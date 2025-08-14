import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validate as uuidValidate } from 'uuid';

const prisma = new PrismaClient();

export const getPaginatedReviews = async (req: Request, res: Response) => {
    const product_id = req.query.product_id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 6;

    if (!product_id) {
        res.status(400).json({ error: 'Product ID is required' });
    }

    if (!uuidValidate(product_id)) {
        res.status(400).json({ error: 'Invalid product ID format' });
    }

    try {
        const offset = (page - 1) * limit;

        const reviews = await prisma.review.findMany({
            where: {
                product_id: product_id,
                status: 'APPROVED'
            },
            skip: offset,
            take: limit,
            orderBy: {
                created_at: 'desc'
            },
            include: {
                customer: {
                    select: {
                        name: true
                    }
                }
            }
        });

        const totalReviews = await prisma.review.count({
            where: {
                product_id: product_id,
                status: 'APPROVED'
            }
        });

        const totalPages = Math.ceil(totalReviews / limit);

        res.json({
            reviews,
            pagination: {
                currentPage: page,
                totalPages,
                totalReviews,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        console.error('Failed to fetch paginated reviews:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getReviewSummary = async (req: Request, res: Response) => {
    const product_id = req.query.product_id as string;

    if (!product_id) {
        res.status(400).json({ error: 'Product ID is required' });
    }

    if (!uuidValidate(product_id)) {
        res.status(400).json({ error: 'Invalid product ID format' });
    }

    try {
        const result = await prisma.review.groupBy({
            by: ['rating'],
            where: {
                product_id: product_id,
                status: 'APPROVED'
            },
            _count: {
                rating: true
            }
        });

        const totalReviews = result.reduce((sum, item) => sum + item._count.rating, 0);
        const averageRating = result.reduce((sum, item) => {
            const ratingValue = {
                'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5
            }[item.rating];
            return sum + (ratingValue * item._count.rating);
        }, 0) / totalReviews || 0;

        res.json({
            averageRating,
            totalReviews
        });
    } catch (error) {
        console.error('Failed to fetch review summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};