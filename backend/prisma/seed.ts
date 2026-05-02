import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import {
  deriveKek,
  encryptCryptoKey,
  generateCryptoKey,
  generateSalt,
} from '../src/utils/crypto.ts'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du seed...')

  const email = process.env.ADMIN_EMAIL!
  const firstName = process.env.ADMIN_FIRSTNAME!
  const lastName = process.env.ADMIN_LASTNAME!
  const password = process.env.ADMIN_PASSWORD!

  // Hash du mot de passe
  const password_hash = await bcrypt.hash(password, 12)

  // Génération de la crypto_key + KEK
  const cryptoKey = generateCryptoKey()
  const kek_salt = generateSalt()
  const kek = await deriveKek(password, Buffer.from(kek_salt, 'hex'))
  const encrypted_crypto_key = encryptCryptoKey(cryptoKey, kek)

  // 1. Rôle ADMIN
  const adminRole = await prisma.roles.upsert({
    where: { role_id: 1 },
    update: {},
    create: { role: 'ADMIN' },
  })
  console.log('✅ Rôle créé :', adminRole)

  // 2. Utilisateur admin
  const existingAdmin = await prisma.users.findFirst({ where: { email } })
  const admin =
    existingAdmin ??
    (await prisma.users.create({
      data: {
        email,
        firstName,
        lastName,
        password_hash,
        is_active: true,
        encrypted_crypto_key,
        kek_salt,
        is_email_verified: true,
        userRoles: {
          create: { role_id: adminRole.role_id },
        },
      },
    }))
  console.log('✅ Admin créé avec succès :', admin)
}

main()
  .catch((e) => {
    console.error('❌ Erreur :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
