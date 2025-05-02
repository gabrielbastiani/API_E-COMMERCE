import prismaClient from '../../prisma';

interface MetadataRequest {
    emailTemplate_id: string;
    title?: string;
    subject?: string;
    variables?: string[];
    isActive?: boolean;
    hoursAfter?: number;
}

class UpdateTemplateMetadataService {
    async execute({ emailTemplate_id, ...data }: MetadataRequest) {
        return prismaClient.emailTemplate.update({
            where: { id: emailTemplate_id },
            data
        });
    }
}

export { UpdateTemplateMetadataService };