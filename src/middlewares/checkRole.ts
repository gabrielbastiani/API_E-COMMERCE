import { Request, Response, NextFunction } from 'express';

export function checkRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    next();
  };
}