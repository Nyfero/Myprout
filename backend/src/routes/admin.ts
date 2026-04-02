// routes/admin.ts
import express from 'express'
import prisma from '../prisma'
import {
  sendAccountSetupToUser,
  sendRejectedToUser,
} from '../services/email/email'
import { authMiddleware } from '../middlewares/authMiddleware'
import { isAdmin } from '../middlewares/isAdmin'
import { generateToken, hashToken } from '../utils/jwt'

const router = express.Router()

router.post('/approve/:user_id', authMiddleware, isAdmin, async (req, res) => {
  const { user_id } = req.params

  let user
  try {
    user = await prisma.users.findUnique({
      where: { user_id: Number(user_id) },
    })
  } catch (error) {
    console.error('Erreur lecture user :', error)
    return res
      .status(500)
      .json({ message: "Erreur lors de la recherche de l'utilisateur" })
  }

  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' })

  const token = generateToken({ userId: user.user_id, email: user.email }, '7d')
  const token_hash = hashToken(token)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { user_id: user.user_id },
        data: {
          is_active: true,
          userRoles: {
            create: {
              role: {
                connect: {
                  role_id: 2,
                },
              },
            },
          },
        },
      })

      await tx.tokens.create({
        data: {
          user_id: user.user_id,
          token_hash,
          type: 'activate',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 1000),
        },
      })
    })
  } catch (error) {
    console.error('Erreur mise à jour user :', error)
    return res.status(500).json({
      message: 'Erreur lors de la validation du compte',
      detail: error.message,
    })
  }

  try {
    await sendAccountSetupToUser(user, token)
  } catch (error) {
    console.error('Erreur envoi email setup mot de passe :', error)
  }

  res.json({ message: `Compte de ${user.email} validé. Email envoyé.` })
})

router.delete('/reject/:user_id', authMiddleware, isAdmin, async (req, res) => {
  const { user_id } = req.params

  let user
  try {
    user = await prisma.users.findUnique({
      where: { user_id: Number(user_id) },
    })
  } catch (error) {
    console.error('Erreur lecture user :', error)
    return res
      .status(500)
      .json({ message: "Erreur lors de la recherche de l'utilisateur" })
  }

  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' })

  try {
    await prisma.users.delete({
      where: { user_id: user.user_id },
    })
  } catch (error) {
    console.error('Erreur suppression user :', error)
    return res
      .status(500)
      .json({ message: 'Erreur lors de la suppression du compte' })
  }

  try {
    await sendRejectedToUser(user)
  } catch (error) {
    console.error('Erreur envoi email rejet :', error)
  }

  res.json({ message: `Compte de ${user.email} refusé et supprimé.` })
})

router.get('/pending-users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const usersList = await prisma.users.findMany({
      where: { is_active: false },
      select: {
        user_id: true,
        email: true,
        firstName: true,
        lastName: true,
        created_at: true,
      },
    })

    res.json(usersList)
  } catch (error) {
    console.error('Erreur récupération pending users :', error)
    res
      .status(500)
      .json({ message: 'Erreur lors de la récupération des utilisateurs' })
  }
})

export default router
