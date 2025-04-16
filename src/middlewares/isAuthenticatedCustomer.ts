import { NextFunction, Request, Response } from 'express'
import { verify } from 'jsonwebtoken'

interface Payload {
  sub: string;
}

declare global {
  namespace Express {
    interface Request {
      customer_id?: string;
    }
  }
}

export async function isAuthenticatedCustomer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authToken = req.headers.authorization;

  if (!authToken) {
    res.status(401).end();
    return;
  }

  const [, token] = authToken.split(" ")

  try {
    const { sub } = verify(
      token,/* @ts-ignore */
      process.env?.JWT_SECRET
    ) as Payload;

    req.customer_id = sub;

    next();

  } catch (err) {
    res.status(401).end();
    return;
  }

}