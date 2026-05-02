import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Suppression de tous les utilisateurs...')

  await prisma.tokens.deleteMany()
  await prisma.userRoles.deleteMany()
  await prisma.passwords.deleteMany()
  await prisma.users.deleteMany()

  console.log('✅ Tous les utilisateurs supprimés.')
}

main()
  .catch((e) => {
    console.error('❌ Erreur :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
