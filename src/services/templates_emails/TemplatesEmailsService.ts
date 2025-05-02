import moment from "moment";
import prismaClient from "../../prisma";
import { Prisma } from "@prisma/client";

class TemplatesEmailsService {
    async execute(
        page: number = 1,
        limit: number = 5,
        search: string = "",
        orderBy: string = "created_at",
        orderDirection: Prisma.SortOrder = "desc",
        startDate?: string,
        endDate?: string
    ) {
        const skip = (page - 1) * limit;

        // Construção da cláusula 'where' com filtro de texto e data
        const whereClause: Prisma.EmailTemplateWhereInput = {
            ...(
                search ? {
                    OR: [
                        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
                    ]
                } : {}
            ),
            ...(
                startDate && endDate ? {
                    created_at: {
                        gte: moment(startDate).startOf('day').toISOString(),
                        lte: moment(endDate).endOf('day').toISOString(),
                    }
                } : {}
            )
        };

        const all_templates = await prismaClient.emailTemplate.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection },
        });

        const total_templates = await prismaClient.emailTemplate.count({
            where: whereClause,
        });

        return {
            templates_emails: all_templates,
            currentPage: page,
            totalPages: Math.ceil(total_templates / limit),
            totalTemplatesEmails: total_templates,
        };
    }
}

export { TemplatesEmailsService };