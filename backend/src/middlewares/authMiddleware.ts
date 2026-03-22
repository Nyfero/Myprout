// middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken} from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: number;
        email: string;
        isAdmin: boolean;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token) as {
      user_id: number;
      email: string;
      isAdmin: boolean;
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};
