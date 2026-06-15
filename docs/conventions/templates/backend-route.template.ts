// routes/<resource>.ts
//
// TEMPLATE — Route Express. Copie ce fichier et remplace <resource>.
// Voir CONVENTIONS.md §5 (structure), §6 (erreurs).
//
// Règles clés :
//  - imports tous en haut, externes puis internes
//  - chaque handler async => try/catch avec log + { error } + bon code HTTP
//  - les routes protégées passent authMiddleware (et isAdmin si besoin)
//  - jamais de hash / clé / secret dans la réponse

import express from 'express'
import prisma from '../prisma'
import { authMiddleware } from '../middlewares/authMiddleware'
// import logger from '../utils/logger' // cf. story logging Winston

const router = express.Router()

// ─── LIST ─────────────────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const items = await prisma.resource.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { title: 'asc' },
    })
    res.json(items)
  } catch (error) {
    // logger.error('resource.list a échoué', error)
    res.status(500).json({ error: 'Erreur lors de la récupération' })
  }
})

// ─── CREATE ───────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { title } = req.body

  // 1. Validation des entrées
  if (!title) {
    return res.status(400).json({ error: 'Champs manquants' })
  }

  try {
    const created = await prisma.resource.create({
      data: { title, user_id: req.user.user_id },
    })
    res.status(201).json(created)
  } catch (error) {
    // logger.error('resource.create a échoué', error)
    res.status(500).json({ error: 'Erreur lors de la création' })
  }
})

// ─── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { title } = req.body

  try {
    const updated = await prisma.resource.update({
      where: { resource_id: Number(id), user_id: req.user.user_id },
      data: { title },
    })
    res.json(updated)
  } catch (error) {
    // logger.error('resource.update a échoué', error)
    res.status(500).json({ error: 'Erreur lors de la mise à jour' })
  }
})

// ─── DELETE ───────────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params

  try {
    await prisma.resource.delete({
      where: { resource_id: Number(id), user_id: req.user.user_id },
    })
    res.status(204).send()
  } catch (error) {
    // logger.error('resource.delete a échoué', error)
    res.status(500).json({ error: 'Erreur lors de la suppression' })
  }
})

export default router
</content>
