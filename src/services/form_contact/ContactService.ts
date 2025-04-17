import prismaClient from "../../prisma";

interface ContactProps {
    formContact_id: string;
}

class ContactService {
    async execute({ formContact_id }: ContactProps) {

        const contact = await prismaClient.formContact.findUnique({
            where: {
                id: formContact_id
            }
        });

        return contact;

    }
}

export { ContactService }