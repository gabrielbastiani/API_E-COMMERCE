import prismaClient from "../../../../prisma";

interface AddressProps {
    customer_id: string;
}

class ListAddressCustomerService {
    async execute({ customer_id }: AddressProps) {
        const address = await prismaClient.address.findMany({
            where: {
                customer_id: customer_id
            },
            include: {
                customer: true
            }
        });

        return address;

    }
}

export { ListAddressCustomerService }