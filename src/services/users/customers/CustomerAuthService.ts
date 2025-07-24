import prismaClient from '../../../prisma';
import { compare } from 'bcryptjs'
import { sign } from 'jsonwebtoken'

interface AuthRequest {
    email: string;
    password: string;
}

class CustomerAuthService {
    async execute({ email, password }: AuthRequest) {
        const customer = await prismaClient.customer.findFirst({
            where: {
                email: email,
                status: "DISPONIVEL"
            }
        })

        if (!customer) {
            throw new Error("User/password incorrect")
        }

        const passwordMatch = await compare(password, customer.password)

        if (!passwordMatch) {
            throw new Error("User/password incorrect")
        }

        await prismaClient.customer.update({
            where: {
                id: customer.id
            },
            data: {
                last_access: new Date()
            }
        });

        const token = sign(
            {
                name: customer.name,
                email: customer.email
            },/* @ts-ignore */
            process.env?.JWT_SECRET,
            {
                subject: customer.id,
                expiresIn: '30d'
            }
        )

        return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            type_user: customer.type_user,
            cpf: customer.cpf,
            cnpj: customer.cnpj,
            date_of_birth: customer.date_of_birth,
            sexo: customer.sexo,
            state_registration: customer.state_registration,
            photo: customer.photo,
            newsletter: customer.newsletter,
            asaas_customer_id: customer.asaas_customer_id,
            token: token
        }
    }
}

export { CustomerAuthService };