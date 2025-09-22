import prismaClient from "../../../prisma";

interface QuestionProductProps {
    product_id: string;
    page?: number;
    pageSize?: number;
    q?: string;
    dateFrom?: string; // ISO date string (yyyy-mm-dd)
    dateTo?: string;   // ISO date string (yyyy-mm-dd)
}

class QuestionProductStatusApprovedService {
    async execute({ product_id, page = 1, pageSize = 10, q, dateFrom, dateTo }: QuestionProductProps) {
        // sanitize / coerce
        const p = Math.max(1, Number(page) || 1);
        const ps = Math.max(1, Math.min(100, Number(pageSize) || 10)); // limite máximo 100 por página

        // build where
        const whereAny: any = {
            product_id,
            status: "APPROVED",
        };

        // date filters -> Prisma expects Date objects for comparisons
        if (dateFrom || dateTo) {
            whereAny.created_at = {};
            if (dateFrom) {
                const dFrom = new Date(dateFrom);
                whereAny.created_at.gte = dFrom;
            }
            if (dateTo) {
                const dTo = new Date(dateTo);
                // include end of day for `dateTo`
                dTo.setHours(23, 59, 59, 999);
                whereAny.created_at.lte = dTo;
            }
        }

        // if search term provided, build OR for question text, customer name and response text
        let whereFinal: any = { ...whereAny };

        if (q && q.trim().length > 0) {
            const term = q.trim();
            whereFinal = {
                AND: [
                    whereAny,
                    {
                        OR: [
                            { question: { contains: term, mode: "insensitive" } },
                            { customer: { name: { contains: term, mode: "insensitive" } } },
                            {
                                responseQuestionProduct: {
                                    some: {
                                        response: { contains: term, mode: "insensitive" }
                                    }
                                }
                            }
                        ]
                    }
                ]
            };
        }

        // total count for pagination
        const total = await prismaClient.questionProduct.count({
            where: whereFinal
        });

        // fetch paginated data with includes
        const items = await prismaClient.questionProduct.findMany({
            where: whereFinal,
            include: {
                customer: true,
                product: true,
                responseQuestionProduct: true,
            },
            orderBy: {
                created_at: "desc"
            },
            skip: (p - 1) * ps,
            take: ps
        });

        return {
            data: items,
            total,
            page: p,
            pageSize: ps
        };
    }
}

export { QuestionProductStatusApprovedService };