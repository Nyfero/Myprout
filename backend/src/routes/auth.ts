// routes/auth.ts (Express)
import express from 'express';
import prisma from '../prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendApprovalEmailToAdmin, sendPendingApprovalEmail } from '../services/email';
import { generateToken, verifyToken, hashToken } from '../utils/jwt';
import { hashPassword } from '../utils/hash';
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, firstName, lastName } = req.body;

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: "Tous les champs sont requis" });
  }

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    }

    const user = await prisma.users.create({
      data: {
        email,
        firstName,
        lastName,
        is_active: false
      },
    });
    await sendApprovalEmailToAdmin(user);
    await sendPendingApprovalEmail(user);
    
    res.status(201).json({
      message: "Compte créé en attente de validation par l'administrateur.",
      user: { user_id: user.user_id, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur lors de la création du compte" });
  }
});

router.post('/set-password', async (req, res) => {
  const { token, password } = req.body;

  try {
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Token invalide ou expiré' });
    }

    const tokenHash = hashToken(token);
    const cryptoSalt = crypto.randomBytes(32).toString('hex');

    const user = await prisma.users.findUnique({
      where: { token_hash: tokenHash },
    });
    
    if (!user) {
      return res.status(400).json({ error: "Token invalide ou déjà utilisé" });
    }
    
    const password_hash = await hashPassword(password);
    await prisma.users.update({
      where: { user_id: user.user_id },
      data: {
        password_hash,
        token_hash: null,
        crypto_salt: cryptoSalt,
      },
    });
    
    res.json({ message: "Mot de passe défini avec succès. Vous pouvez maintenant vous connecter." });
  } catch (error) {
    console.error('[SET-PASSWORD ERROR]', error);
    res.status(500).json({ error: "Erreur serveur lors de la définition du mot de passe" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    console.log('User avec roles :', JSON.stringify(user, null, 2))

    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: "Votre compte est en attente de validation par un administrateur" });
    }

    if (!user.password_hash) {
      return res.status(403).json({ error: "Vous devez d'abord définir votre mot de passe via l'email reçu" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const isAdmin = user.userRoles.some(ur => ur.role.role === 'Admin')

    const token = generateToken({ user_id: user.user_id, email: user.email, isAdmin }, '1h');

    res.json({
      token,
      crypto_salt : user.crypto_salt,
      user: {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin
      }
    });

  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    res.status(500).json({ error: "Erreur serveur lors de la connexion" });
  }
});

router.post('/verify-password', async (req, res) => {
  console.log('ici');
  const { email, password } = req.body;

  try {
    const user = await prisma.users.findUnique({ where: { email } });

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});


// router.post('/forgot-password', async (req, res) => {
//   const { email } = req.body;

//   try {
//     const user = await prisma.users.findUnique({ where: { email } });

//     // ⚠️ Toujours répondre 200 même si l'email n'existe pas (sécurité)
//     if (!user) {
//       return res.status(200).json({ message: 'Si cet email existe, un lien a été envoyé.' });
//     }

//     // 1. Générer le JWT token (ce qui sera dans le lien email)
//     const resetToken = generateToken({ email: user.email }, '7d');

//     // 2. Hasher le token pour la BDD
//     const resetTokenHash = hashToken(resetToken);

//     // 3. Stocker uniquement le hash en base
//     await prisma.users.update({
//       where: { email },
//       data: {
//         password_reset_token: resetTokenHash,
//       },
//     });

//     // 4. Envoyer le lien avec le token ORIGINAL (pas le hash)
//     const resetLink = `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`;
    
//     await sendResetEmail(email, resetLink); // Votre fonction d'envoi d'email

//     return res.status(200).json({ message: 'Si cet email existe, un lien a été envoyé.' });

//   } catch (error) {
//     console.error('[FORGOT-PASSWORD ERROR]', error);
//     return res.status(500).json({ message: 'Erreur serveur' });
//   }
// });

export default router;