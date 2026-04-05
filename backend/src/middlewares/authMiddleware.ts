// middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express'
import { verifyToken, hashToken } from '../utils/jwt'
import prisma from '../prisma'

declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: number
        email: string
        isAdmin: boolean
      }
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyToken(token) as {
      user_id: number
      email: string
      isAdmin: boolean
    }

    if (!decoded) {
      return res.status(401).json({ error: 'Token invalide' })
    }

    const tokenHash = hashToken(token)
    const tokenInDb = await prisma.tokens.findFirst({
      where: {
        token_hash: tokenHash,
        type: 'access',
        expires_at: { gt: new Date() },
      },
    })

    if (!tokenInDb) {
      return res.status(401).json({ error: 'Token révoqué ou inexistant' })
    }

    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
