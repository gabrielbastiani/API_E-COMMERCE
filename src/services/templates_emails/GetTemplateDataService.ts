import prismaClient from "../../prisma";

interface TemplateRequest {
    emailTemplate_id: string;
}

class GetTemplateDataService {
    async execute({ emailTemplate_id }: TemplateRequest) {
        const emailData = await prismaClient.emailTemplate.findUnique({
            where: {
                id: emailTemplate_id
            }
        });

        return emailData;

    }
}

export { GetTemplateDataService }