import { Request, Response, NextFunction } from 'express'
import asyncHandler from 'express-async-handler'
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

export const isAuthenticatedCustomer = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authToken = req.headers.authorization

    if (!authToken) {
      res.status(401).end()
      return
    }

    const [, token] = authToken.split(' ')

    const { sub } = verify(
      token,
      process.env.JWT_SECRET!
    ) as Payload

    req.customer_id = sub
    next()
  }
)