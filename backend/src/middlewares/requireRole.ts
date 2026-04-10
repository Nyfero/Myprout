// middlewares/requireRole.ts
import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma'

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'Admin') {
    return res
      .status(403)
      .json({ error: 'Accès refusé : droits administrateur requis' })
  }
  next()
}

export function requireNotDemo(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role === 'Demo') {
    return res
      .status(403)
      .json({ error: 'Action non disponible en mode démonstration' })
  }
  next()
}

export function limitDemoCount(model: string, limit: number) {
  return async (req, res, next) => {
    if (req.user?.role !== 'Demo') return next()
    const count = await (prisma as any)[model].count({
      where: { user_id: req.user.user_id },
    })
    if (count >= limit)
      return res
        .status(403)
        .json({ error: `Limite de ${limit} atteinte en mode démonstration` })
    next()
  }
}
