import { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
            };
        }
    }
}

export async function isAuthenticated(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const authToken = req.headers.authorization;

    if (!authToken) {
        return res.status(401).end();
    }

    const [, token] = authToken.split(" ");

    try {
        const { sub } = verify(
            token,
            process.env.JWT_SECRET as string
        ) as { sub: string };

        const user = await prisma.user.findUnique({
            where: { id: sub },
            select: { id: true, role: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = {
            id: user.id,
            role: user.role
        };

        return next();

    } catch (err) {
        return res.status(401).end();
    }
}