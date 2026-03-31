// routes/auth.ts (Express)
import express from 'express'
import prisma from '../prisma'
import bcrypt from 'bcrypt'
import {
  sendApprovalEmailToAdmin,
  sendPendingApprovalEmail,
  sendRecoveryMail,
} from '../services/email'
import { generateToken, verifyToken, hashToken } from '../utils/jwt'
import { authMiddleware } from '../middlewares/authMiddleware'
import {
  deriveKek,
  encryptCryptoKey,
  decryptCryptoKey,
  generateCryptoKey,
  generateSalt,
} from '../utils/crypto'

const router = express.Router()

// ─── REGISTER ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, firstName, lastName } = req.body

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: 'Tous les champs sont requis' })
  }

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' })
    }

    const user = await prisma.users.create({
      data: {
        email,
        firstName,
        lastName,
        is_active: false,
      },
    })

    await sendApprovalEmailToAdmin(user)
    await sendPendingApprovalEmail(user)

    res.status(201).json({
      message: "Compte créé en attente de validation par l'administrateur.",
      user: { user_id: user.user_id, email: user.email },
    })
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Erreur serveur lors de la création du compte' })
  }
})

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────
router.post('/activate', async (req, res) => {
  const { token, password, security_questions } = req.body

  try {
    let decoded
    try {
      decoded = verifyToken(token)
    } catch (err) {
      return res.status(401).json({ message: 'Token invalide ou expiré' })
    }

    const tokenHash = hashToken(token)
    const user = await prisma.users.findUnique({
      where: { token_hash: tokenHash },
    })

    if (!user) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' })
    }

    // Hash du mot de passe maître
    const password_hash = await bcrypt.hash(password, 12)

    // Génération de la crypto_key définitive (aléatoire, ne changera jamais)
    const cryptoKey = generateCryptoKey()

    // Génération du KEK salt
    const kek_salt = generateSalt()

    // Dérivation du KEK depuis le mot de passe
    const kek = await deriveKek(password, Buffer.from(kek_salt, 'hex'))

    // Chiffrement de la crypto_key avec le KEK
    const encrypted_crypto_key = encryptCryptoKey(cryptoKey, kek)

    // Concaténation des réponses normalisées
    const recoveryPassphrase = security_questions
      .map((q) => q.answer.toLowerCase().replace(/\s/g, '').trim())
      .join('')

    // Dérivation du recovery KEK depuis les réponses + kek_salt (réutilisé)
    const recoveryKek = await deriveKek(
      recoveryPassphrase,
      Buffer.from(kek_salt, 'hex')
    )

    // Chiffrement de la crypto_key avec le recovery KEK
    const recovery_encrypted_crypto_key = encryptCryptoKey(
      cryptoKey,
      recoveryKek
    )

    // Hash des réponses pour vérification future
    const hashedQuestions = await Promise.all(
      security_questions.map(async (q) => ({
        question: q.question,
        answer_hash: await bcrypt.hash(
          q.answer.toLowerCase().replace(/\s/g, '').trim(),
          12
        ),
      }))
    )

    await prisma.users.update({
      where: { user_id: user.user_id },
      data: {
        password_hash,
        encrypted_crypto_key,
        kek_salt,
        token_hash: null,
        is_active: true,
        recovery_questions: hashedQuestions,
        recovery_encrypted_crypto_key,
      },
    })

    res.json({
      message:
        'Mot de passe défini avec succès. Vous pouvez maintenant vous connecter.',
    })
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Erreur serveur lors de la définition du mot de passe' })
  }
})

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    if (!user.is_active) {
      return res.status(403).json({
        error:
          'Votre compte est en attente de validation par un administrateur',
      })
    }

    if (!user.password_hash) {
      return res.status(403).json({
        error: "Vous devez d'abord définir votre mot de passe via l'email reçu",
      })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    const isAdmin = user.userRoles.some((ur) => ur.role.role === 'Admin')

    const token = generateToken(
      { user_id: user.user_id, email: user.email, isAdmin },
      '1h'
    )

    res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        kek_salt: user.kek_salt,
        encrypted_crypto_key: user.encrypted_crypto_key,
        isAdmin,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' })
  }
})

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
router.put('/password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body
  const userId = req.user.user_id

  try {
    const user = await prisma.users.findUnique({ where: { user_id: userId } })

    if (!user || !user.password_hash) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }

    const isValid = await bcrypt.compare(oldPassword, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' })
    }

    const oldKek = await deriveKek(
      oldPassword,
      Buffer.from(user.kek_salt!, 'hex')
    )
    let cryptoKey: string
    try {
      cryptoKey = decryptCryptoKey(user.encrypted_crypto_key!, oldKek)
    } catch {
      return res.status(500).json({ error: 'Impossible de déchiffrer la clé' })
    }

    const password_hash = await bcrypt.hash(newPassword, 12)
    const newKek = await deriveKek(
      newPassword,
      Buffer.from(user.kek_salt!, 'hex')
    )
    const encrypted_crypto_key = encryptCryptoKey(cryptoKey, newKek)

    await prisma.users.update({
      where: { user_id: userId },
      data: {
        password_hash,
        encrypted_crypto_key,
      },
    })

    res.json({
      encryptedCryptoKey: encrypted_crypto_key,
      message: 'Mot de passe modifié avec succès',
    })
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ─── VERIFY PASSWORD ──────────────────────────────────────────────────────────
router.post('/password/verify', authMiddleware, async (req, res) => {
  const { password } = req.body

  const user = await prisma.users.findUnique({
    where: { user_id: req.user.user_id },
  })

  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Mot de passe incorrect' })
  }

  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    return res.status(401).json({ error: 'Mot de passe incorrect' })
  }

  res.json({ valid: true })
})

// ─── SEND RECOVERY MAIL ───────────────────────────────────────────────────────
router.post('/password/forgot', async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email requis.' })
  }

  try {
    const user = await prisma.users.findUnique({ where: { email } })

    if (!user || !user.is_active) {
      return res.status(200).json({ success: true })
    }

    const token = generateToken(
      { userId: user.user_id, email: user.email },
      '1h'
    )
    const token_hash = hashToken(token)

    await prisma.users.update({
      where: { user_id: user.user_id },
      data: {
        token_hash,
      },
    })

    await sendRecoveryMail(user, token)

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
router.put('/password/reset', async (req, res) => {
  const { token, encrypted_crypto_key, password } = req.body
  try {
    let decoded
    try {
      decoded = verifyToken(token)
    } catch (err) {
      return res.status(401).json({ message: 'Token invalide ou expiré' })
    }

    const tokenHash = hashToken(token)
    const user = await prisma.users.findUnique({
      where: { token_hash: tokenHash },
    })

    if (!user) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' })
    }

    const password_hash = await bcrypt.hash(password, 12)

    await prisma.users.update({
      where: { user_id: user.user_id },
      data: {
        password_hash,
        encrypted_crypto_key,
      },
    })

    res.json({
      message:
        'Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.',
    })
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Erreur serveur lors de la modification du mot de passe' })
  }
})

// ─── GET SECURITY QUESTIONS ───────────────────────────────────────────────────
router.get('/recovery', async (req, res) => {
  const { token } = req.query

  try {
    let decoded
    try {
      decoded = verifyToken(token)
    } catch (err) {
      return res.status(401).json({ message: 'Token invalide ou expiré' })
    }

    const tokenHash = hashToken(token)
    const user = await prisma.users.findUnique({
      where: { token_hash: tokenHash },
    })

    if (!user || !user.recovery_questions) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' })
    }

    const raw =
      typeof user.recovery_questions === 'string'
        ? JSON.parse(user.recovery_questions)
        : user.recovery_questions

    const questions = raw.map((q) => q.question)
    res.json({ questions })
  } catch (error) {
    res.status(500).json({
      error: 'Erreur serveur lors de la recupération des questions de sécurité',
    })
  }
})

// ─── VERIFY SECURITY QUESTIONS ────────────────────────────────────────────────
router.post('/recovery/verify', async (req, res) => {
  const { token, security_questions } = req.body

  if (!token || !security_questions) {
    return res.status(400).json({ error: 'Champs manquants' })
  }

  try {
    let decoded
    try {
      decoded = verifyToken(token)
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide ou expiré' })
    }

    const tokenHash = hashToken(token)
    const user = await prisma.users.findUnique({
      where: { token_hash: tokenHash },
    })

    if (!user || !user.recovery_questions) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' })
    }

    const stored =
      typeof user.recovery_questions === 'string'
        ? JSON.parse(user.recovery_questions)
        : user.recovery_questions

    const allCorrect = (
      await Promise.all(
        security_questions.map(async (incoming) => {
          const match = stored.find(
            (s) =>
              s.question.trim().toLowerCase() ===
              incoming.question.trim().toLowerCase()
          )
          if (!match) return false
          return bcrypt.compare(
            incoming.answer.toLowerCase().replace(/\s/g, '').trim(),
            match.answer_hash
          )
        })
      )
    ).every(Boolean)

    if (!allCorrect) {
      return res.status(401).json({ error: 'Réponses incorrectes' })
    }

    res.json({
      success: true,
      recovery_encrypted_crypto_key: user.recovery_encrypted_crypto_key,
      kek_salt: user.kek_salt,
    })
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de la vérification' })
  }
})

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
router.delete('/account', authMiddleware, async (req, res) => {
  const { password } = req.body
  const userId = req.user.user_id

  try {
    const user = await prisma.users.findUnique({ where: { user_id: userId } })

    if (!user || !user.password_hash) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Mot de passe incorrect' })
    }

    await prisma.$transaction([
      prisma.passwords.deleteMany({ where: { user_id: userId } }),
      // prisma.ipAddress.deleteMany({ where: { user_id: userId } }),
      prisma.userRoles.deleteMany({ where: { user_id: userId } }),
      prisma.users.delete({ where: { user_id: userId } }),
    ])

    res.json({ message: 'Compte supprimé avec succès' })
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
