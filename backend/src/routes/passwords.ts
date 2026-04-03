// routes/passwords.ts
import express from 'express'
import prisma from '../prisma'
import { authMiddleware } from '../middlewares/authMiddleware'
const router = express.Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const passwords = await prisma.passwords.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { title: 'asc' },
    })
    res.json(passwords)
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Erreur lors de la récupération des mots de passe' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  const { title, username, password, note } = req.body
  try {
    const newPassword = await prisma.passwords.create({
      data: {
        title,
        username,
        password,
        note,
        user_id: req.user.user_id,
      },
    })
    res.status(201).json(newPassword)
  } catch (error) {
    res
      .status(400)
      .json({ error: 'Erreur lors de la création du mot de passe' })
  }
})

router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { title, username, password, note } = req.body
  try {
    const updatedPassword = await prisma.passwords.update({
      where: { password_id: parseInt(id), user_id: req.user.user_id },
      data: { title, username, password, note },
    })
    res.json(updatedPassword)
  } catch (error) {
    res.status(400).json({ error: 'Erreur lors de la mise à jour' })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  try {
    await prisma.passwords.delete({
      where: { password_id: parseInt(id), user_id: req.user.user_id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: 'Erreur lors de la suppression' })
  }
})

router.patch('/:id/is_stared', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { is_stared } = req.body

  try {
    const updated = await prisma.passwords.update({
      where: { password_id: Number(id) },
      data: { is_stared },
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.get('/logo', async (req, res) => {
  const { domain } = req.query

  try {
    const response = await fetch(
      `https://img.logo.dev/${domain}?fallback=404&token=${process.env.LOGO_DEV_TOKEN}`
    )

    if (response.status === 404 || !response.ok) {
      return res.status(404).end()
    }

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(Buffer.from(buffer))
  } catch (err) {
    res.status(500).end()
  }
})

export default router
