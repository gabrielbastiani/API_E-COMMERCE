import prismaClient from '../../../prisma';
import { hash } from 'bcryptjs'

interface UserRequest {
    passwordRecoveryCustomer_id: string;
    password: string;
}

class PasswordRecoveryCustomerSevice {
    async execute({ passwordRecoveryCustomer_id, password }: UserRequest) {
        const recovery = await prismaClient.passwordRecoveryCustomer.findUnique({
            where: {
                id: passwordRecoveryCustomer_id
            },
        });

        if (!recovery) {
            throw {
                error: { message: "Conta não encontrada." },
                code: 400,
            };
        }

        const hashedPassword = await hash(password, 8);

        await prismaClient.customer.update({
            where: {
                email: recovery.email,
            },
            data: {
                password: hashedPassword,
            },
        });

        await prismaClient.passwordRecoveryCustomer.delete({
            where: {
                id: recovery.id,
            },
        });

        return {
            message: "Senha atualizada com sucesso",
        };
    }
}

export { PasswordRecoveryCustomerSevice };