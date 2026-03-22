import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';

export function generateToken(payload: object, expiresIn: string): string {
  const privateKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH as string);
  
  return jwt.sign(
    { ...payload },
    privateKey,
    {
      expiresIn,
      algorithm: 'RS256'
    }
  );
}

export function verifyToken(token: string) {
  try {
    const publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH as string);
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (err) {
    return null;
  }
}

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

