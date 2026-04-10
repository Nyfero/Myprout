// routes/auth.ts (Express)
import express from 'express'
import prisma from '../prisma'
import bcrypt from 'bcrypt'
import {
  sendConfirmEmailToUser,
  sendRequestInscriptionToAdmin,
  sendRecoveryToUser,
} from '../services/email/email'
import {
  generateToken,
  generateRandomToken,
  verifyToken,
  hashToken,
} from '../utils/jwt'
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
    return res.status(400).json({ error: 'Champs manquants' })
  }

  try {
    const existingVerifiedUser = await prisma.users.findFirst({
      where: {
        email,
        is_email_verified: true,
      },
    })

    if (existingVerifiedUser) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' })
    }

    const verifyToken = generateRandomToken()
    const token_hash = hashToken(verifyToken)

    const { user } = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          email,
          firstName,
          lastName,
          is_active: false,
          is_email_verified: false,
        },
      })

      await tx.tokens.create({
        data: {
          user_id: user.user_id,
          token_hash,
          type: 'email_verification',
        },
      })

      return { user }
    })

    await sendConfirmEmailToUser(user, verifyToken)

    res.status(201).json({
      message:
        "Pour valider l'inscription, merci de confirmer votre adresse email grâce à l'email qui vous a été envoyé.",
    })
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Erreur serveur lors de la création du compte' })
  }
})

// ─── VERIFY EMAIL ────────────────────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({ error: 'Token manquant' })
  }

  try {
    const token_hash = hashToken(token)

    const tokenRecord = await prisma.tokens.findFirst({
      where: {
        token_hash,
        type: 'email_verification',
      },
      include: { user: true },
    })

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Token invalide' })
    }

    const user = tokenRecord.user

    if (user.is_email_verified) {
      return res.status(400).json({ error: 'Email déjà vérifié' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { user_id: user.user_id },
        data: { is_email_verified: true },
      })

      await tx.tokens.delete({
        where: { token_id: tokenRecord.token_id },
      })

      const usersToDelete = await tx.users.findMany({
        where: {
          email: user.email,
          is_email_verified: false,
          user_id: { not: user.user_id },
        },
        select: { user_id: true },
      })

      const ids = usersToDelete.map((u) => u.user_id)

      if (ids.length > 0) {
        await tx.tokens.deleteMany({ where: { user_id: { in: ids } } })
        await tx.users.deleteMany({ where: { user_id: { in: ids } } })
      }
    })

    await sendRequestInscriptionToAdmin(user)

    res.json({
      message: 'Email vérifié. En attente de validation par un administrateur.',
    })
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────
router.post('/activate', async (req, res) => {
  const { token, password, security_questions } = req.body

  if (!token || !password || !security_questions)
    return res.status(400).json({ error: 'Champs manquants' })

  try {
    try {
      verifyToken(token)
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide ou expiré' })
    }

    const token_hash = hashToken(token)

    const tokenRecord = await prisma.tokens.findFirst({
      where: {
        token_hash,
        type: 'activate',
      },
      include: { user: true },
    })

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' })
    }

    if (tokenRecord.expires_at && tokenRecord.expires_at < new Date()) {
      return res.status(401).json({ error: 'Token expiré' })
    }

    const user = tokenRecord.user

    const password_hash = await bcrypt.hash(password, 12)
    const cryptoKey = generateCryptoKey()
    const kek_salt = generateSalt()
    const kek = await deriveKek(password, Buffer.from(kek_salt, 'hex'))
    const encrypted_crypto_key = encryptCryptoKey(cryptoKey, kek)

    const recoveryPassphrase = security_questions
      .map((q) => q.answer.toLowerCase().replace(/\s/g, '').trim())
      .join('')

    const recoveryKek = await deriveKek(
      recoveryPassphrase,
      Buffer.from(kek_salt, 'hex')
    )
    const recovery_encrypted_crypto_key = encryptCryptoKey(
      cryptoKey,
      recoveryKek
    )

    const hashedQuestions = await Promise.all(
      security_questions.map(async (q) => ({
        question: q.question,
        answer_hash: await bcrypt.hash(
          q.answer.toLowerCase().replace(/\s/g, '').trim(),
          12
        ),
      }))
    )

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { user_id: user.user_id },
        data: {
          password_hash,
          encrypted_crypto_key,
          kek_salt,
          is_active: true,
          recovery_questions: hashedQuestions,
          recovery_encrypted_crypto_key,
        },
      })

      await tx.tokens.delete({
        where: { token_id: tokenRecord.token_id },
      })
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
      return res.status(400).json({ error: 'Champs manquants' })
    }
    const user = await prisma.users.findFirst({
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

    if (!user.is_email_verified) {
      return res.status(403).json({
        error: "Votre adresse mail n'est pas vérifié",
      })
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

    const accessToken = generateToken(
      { user_id: user.user_id, email: user.email, isAdmin },
      '15m'
    )

    const refreshToken = generateRandomToken()

    await prisma.$transaction([
      prisma.tokens.deleteMany({
        where: {
          user_id: user.user_id,
          type: { in: ['access', 'refresh', 'password_reset'] },
        },
      }),
      prisma.tokens.createMany({
        data: [
          {
            user_id: user.user_id,
            token_hash: hashToken(accessToken),
            type: 'access',
            expires_at: new Date(Date.now() + 15 * 60 * 1000), // minutes | secondes | milisecondes
          },
          {
            user_id: user.user_id,
            token_hash: hashToken(refreshToken),
            type: 'refresh',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // jours | heures | minutes | secondes | milisecondes
          },
        ],
      }),
    ])

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // jours | heures | minutes | secondes | milisecondes
    })

    res.json({
      token: accessToken,
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

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken

  if (refreshToken) {
    const token_hash = hashToken(refreshToken)

    const tokenInDb = await prisma.tokens.findFirst({ where: { token_hash } })

    if (tokenInDb) {
      await prisma.tokens.deleteMany({ where: { user_id: tokenInDb.user_id } })
    }
  }

  res.clearCookie('refreshToken')
  res.json({ success: true })
})

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token manquant' })
  }

  try {
    const token_hash = hashToken(refreshToken)

    const storedToken = await prisma.tokens.findUnique({
      where: { token_hash },
      include: {
        user: { include: { userRoles: { include: { role: true } } } },
      },
    })

    if (!storedToken) {
      return res.status(401).json({ error: 'Refresh token invalide' })
    }

    if (storedToken.expires_at < new Date()) {
      await prisma.tokens.delete({ where: { token_hash } })
      return res.status(401).json({ error: 'Refresh token expiré' })
    }

    const user = storedToken.user
    const isAdmin = user.userRoles.some((ur) => ur.role.role === 'Admin')

    const newRefreshToken = generateRandomToken()
    const newTokenHash = hashToken(newRefreshToken)

    await prisma.tokens.deleteMany({
      where: { user_id: user.user_id, type: 'access' },
    })

    await prisma.tokens.update({
      where: { token_hash },
      data: {
        token_hash: newTokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // jours | heures | minutes | secondes | milisecondes
      },
    })

    const accessToken = generateToken(
      { user_id: user.user_id, email: user.email, isAdmin },
      '15m'
    )

    await prisma.tokens.create({
      data: {
        user_id: user.user_id,
        token_hash: hashToken(accessToken),
        type: 'access',
        expires_at: new Date(Date.now() + 15 * 60 * 1000), // minutes | secondes | milisecondes
      },
    })

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // jours | heures | minutes | secondes | milisecondes
    })

    res.json({
      token: accessToken,
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
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
router.put('/password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body
  const userId = req.user.user_id

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Champs manquants' })
  }

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

  if (!password) {
    return res.status(400).json({ error: 'Champs manquants' })
  }

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
    return res.status(400).json({ error: 'Champ manquant' })
  }

  try {
    const user = await prisma.users.findFirst({ where: { email } })

    if (!user || !user.is_active) {
      return res.status(200).json({ success: true })
    }

    const token = generateRandomToken()
    const token_hash = hashToken(token)

    await prisma.$transaction(async (tx) => {
      await tx.tokens.deleteMany({
        where: {
          user_id: user.user_id,
          type: 'password_reset',
        },
      })

      await tx.tokens.create({
        data: {
          user_id: user.user_id,
          token_hash,
          type: 'password_reset',
          expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1h
        },
      })
    })

    await sendRecoveryToUser(user, token)

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
router.put('/password/reset', async (req, res) => {
  const { token, encrypted_crypto_key, password } = req.body

  if (!token || !encrypted_crypto_key || !password)
    return res.status(400).json({ error: 'Champs manquants' })

  try {
    try {
      verifyToken(token)
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide ou expiré' })
    }

    const token_hash = hashToken(token)

    const tokenRecord = await prisma.tokens.findFirst({
      where: {
        token_hash,
        type: 'password_reset',
      },
      include: { user: true },
    })

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' })
    }

    if (tokenRecord.expires_at && tokenRecord.expires_at < new Date()) {
      return res.status(401).json({ error: 'Token expiré' })
    }

    const user = tokenRecord.user

    const password_hash = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { user_id: user.user_id },
        data: { password_hash, encrypted_crypto_key },
      })

      await tx.tokens.delete({
        where: { token_id: tokenRecord.token_id },
      })
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
  if (!token) return res.status(400).json({ error: 'Token manquant' })

  try {
    try {
      verifyToken(token)
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide ou expiré' })
    }

    const token_hash = hashToken(token)

    const tokenRecord = await prisma.tokens.findFirst({
      where: {
        token_hash,
        type: 'password_reset',
      },
      include: { user: true },
    })

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' })
    }

    if (tokenRecord.expires_at && tokenRecord.expires_at < new Date()) {
      return res.status(401).json({ error: 'Token expiré' })
    }

    const user = tokenRecord.user

    if (!user.recovery_questions) {
      return res.status(404).json({ error: 'Aucune question de sécurité' })
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
    try {
      verifyToken(token)
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide ou expiré' })
    }

    const token_hash = hashToken(token)

    const tokenRecord = await prisma.tokens.findFirst({
      where: {
        token_hash,
        type: 'activate',
      },
      include: { user: true },
    })

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' })
    }

    if (tokenRecord.expires_at && tokenRecord.expires_at < new Date()) {
      return res.status(401).json({ error: 'Token expiré' })
    }

    const user = tokenRecord.user

    if (!user.recovery_questions) {
      return res.status(404).json({ error: 'Aucune question de sécurité' })
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

  if (!password) {
    return res.status(400).json({ error: 'Champs manquants' })
  }

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
      prisma.tokens.deleteMany({ where: { user_id: userId } }),
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
