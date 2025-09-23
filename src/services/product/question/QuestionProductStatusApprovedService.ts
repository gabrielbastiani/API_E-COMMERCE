import prismaClient from "../../../prisma";

interface QuestionProductProps {
    product_id: string;
    page?: number;
    pageSize?: number;
    q?: string;
    dateFrom?: string; // expect 'YYYY-MM-DD'
    dateTo?: string;   // expect 'YYYY-MM-DD'
}

class QuestionProductStatusApprovedService {
    async execute({ product_id, page = 1, pageSize = 5, q, dateFrom, dateTo }: QuestionProductProps) {
        const p = Math.max(1, Number(page) || 1);
        const ps = Math.max(1, Math.min(100, Number(pageSize) || 10)); // limite máximo 100 por página

        const whereBase: any = {
            product_id,
            status: "APPROVED",
        };

        if (dateFrom || dateTo) {
            whereBase.created_at = {};
            const SAO_PAULO_OFFSET_HOURS = 3; // UTC = local + 3h  (America/Sao_Paulo currently UTC-3)

            if (dateFrom) {
                // parse yyyy-mm-dd safely
                const m = dateFrom.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (m) {
                    const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
                    // local start of day 00:00 (Sao Paulo) -> UTC = local + OFFSET
                    const utcMillis = Date.UTC(y, mo, d, 0 + SAO_PAULO_OFFSET_HOURS, 0, 0, 0);
                    whereBase.created_at.gte = new Date(utcMillis);
                } else {
                    // fallback: try generic Date parse
                    const dFrom = new Date(dateFrom);
                    whereBase.created_at.gte = isNaN(dFrom.getTime()) ? undefined : dFrom;
                }
            }

            if (dateTo) {
                const m = dateTo.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (m) {
                    const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
                    // local end of day 23:59:59.999 (Sao Paulo) -> UTC = local + OFFSET
                    const utcMillis = Date.UTC(y, mo, d, 23 + SAO_PAULO_OFFSET_HOURS, 59, 59, 999);
                    whereBase.created_at.lte = new Date(utcMillis);
                } else {
                    const dTo = new Date(dateTo);
                    if (!isNaN(dTo.getTime())) {
                        // include full day if possible
                        dTo.setHours(23, 59, 59, 999);
                        whereBase.created_at.lte = dTo;
                    }
                }
            }
        }

        // build search OR (question text, customer name, response text)
        let whereFinal: any = { ...whereBase };

        if (q && q.trim().length > 0) {
            const term = q.trim();
            whereFinal = {
                AND: [
                    whereBase,
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

        // total count
        const total = await prismaClient.questionProduct.count({
            where: whereFinal
        });

        // fetch page
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

export { QuestionProductStatusApprovedService }