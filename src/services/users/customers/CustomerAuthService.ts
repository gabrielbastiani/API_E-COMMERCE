import prismaClient from '../../../prisma';
import { compare } from 'bcryptjs'
import { sign } from 'jsonwebtoken'

interface AuthRequest {
    email: string;
    password: string;
}

class CustomerAuthService {
    async execute({ email, password }: AuthRequest) {
        const user = await prismaClient.customer.findFirst({
            where: {
                email: email,
                status: "DISPONIVEL"
            }
        })

        if (!user) {
            throw new Error("User/password incorrect")
        }

        const passwordMatch = await compare(password, user.password)

        if (!passwordMatch) {
            throw new Error("User/password incorrect")
        }

        await prismaClient.customer.update({
            where: {
                id: user.id
            },
            data: {
                last_access: new Date()
            }
        });

        const token = sign(
            {
                name: user.name,
                email: user.email
            },/* @ts-ignore */
            process.env?.JWT_SECRET,
            {
                subject: user.id,
                expiresIn: '30d'
            }
        )

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            token: token
        }
    }
}

export { CustomerAuthService };