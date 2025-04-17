import prismaClient from '../../../prisma';
import { hash } from 'bcryptjs'

interface UserRequest {
    passwordRecoveryUserEcommerce_id: string;
    password: string;
}

class PasswordRecoveryUserSevice {
    async execute({ passwordRecoveryUserEcommerce_id, password }: UserRequest) {
        const recovery = await prismaClient.passwordRecoveryUserEcommerce.findUnique({
            where: {
                id: passwordRecoveryUserEcommerce_id
            },
        });

        if (!recovery) {
            throw {
                error: { message: "Conta não encontrada." },
                code: 400,
            };
        }

        const hashedPassword = await hash(password, 8);

        await prismaClient.userEcommerce.update({
            where: {
                email: recovery.email,
            },
            data: {
                password: hashedPassword,
            },
        });

        await prismaClient.passwordRecoveryUserEcommerce.delete({
            where: {
                id: recovery.id,
            },
        });

        return {
            message: "Senha atualizada com sucesso",
        };
    }
}

export { PasswordRecoveryUserSevice };