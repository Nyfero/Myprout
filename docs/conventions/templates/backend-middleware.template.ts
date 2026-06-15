// middlewares/<name>Middleware.ts
//
// TEMPLATE — Middleware Express.
// Voir CONVENTIONS.md §5 (structure), §6 (erreurs).
//
// Règles clés :
//  - typer req/res/next avec les types d'Express
//  - sortir tôt (return res.status(...)) en cas d'échec
//  - enrichir req.user / req.* puis appeler next()

import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma'
// import { verifyToken } from '../utils/jwt'

// Si le middleware ajoute des champs à la requête, les déclarer ici (une seule fois
// dans le projet — aujourd'hui c'est fait dans authMiddleware.ts).
// declare global {
//   namespace Express {
//     interface Request {
//       user?: { user_id: number; email: string; isAdmin: boolean }
//     }
//   }
// }

export const exampleMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Pré-conditions
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  try {
    // 2. Logique (vérif en base, droits, etc.)
    const ok = await prisma.userRoles.findFirst({
      where: { user_id: req.user.user_id },
    })

    if (!ok) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    // 3. Laisser passer
    next()
  } catch (error) {
    // logger.error('exampleMiddleware a échoué', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
</content>
