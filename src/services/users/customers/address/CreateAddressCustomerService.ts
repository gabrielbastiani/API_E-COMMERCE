import prismaClient from "../../../../prisma";

interface AddressProps {
    customer_id: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    number?: string;
    neighborhood: string;
    country: string;
    complement?: string;
    reference?: string;
}

class CreateAddressCustomerService {
    async execute({
        customer_id,
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
        const address = await prismaClient.address.create({
            data: {
                customer_id,
                street,
                city,
                state,
                zipCode,
                number,
                neighborhood,
                country,
                complement,
                reference
            }
        });

        return address;

    }

}

export { CreateAddressCustomerService }