import prismaClient from "../../../../prisma";

interface AddressProps {
    address_id: string;
}

class DeleteAddressService {
    async execute({ address_id }: AddressProps) {
        const address = await prismaClient.address.delete({
            where: {
                id: address_id
            }
        });

        return address;

    }
}

export { DeleteAddressService }