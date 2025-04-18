import prismaClient from "../../prisma";

interface FormRequest {
    id_delete: string[];
}

class FormContactDeleteService {
    async execute({ id_delete }: FormRequest) {
        const deletedForms = await prismaClient.formContact.deleteMany({
            where: {
                id: {
                    in: id_delete
                }
            }
        });

        return deletedForms;
    }
}

export { FormContactDeleteService };