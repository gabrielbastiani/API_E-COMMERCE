import prismaClient from "../../../../prisma";

interface AddressProps {
    address_id: string;
    recipient_name?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    number?: string;
    neighborhood?: string;
    country?: string;
    complement?: string;
    reference?: string;
}

class UpdateAddressService {
    async execute({
        address_id,
        recipient_name,
        street,
        city,
        state,
        zipCode,
        number,
        neighborhood,
        country,
        complement,
        reference
    }: AddressProps) {
        const address = await prismaClient.address.update({
            where: {
                id: address_id
            },
            data: {
                recipient_name: recipient_name,
                street: street,
                city: city,
                state: state,
                zipCode: zipCode,
                number: number,
                neighborhood: neighborhood,
                country: country,
                complement: complement,
                reference: reference
            }
        });

        return address;

    }
}

export { UpdateAddressService }