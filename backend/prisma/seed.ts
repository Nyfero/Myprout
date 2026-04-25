import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import {
  deriveKek,
  encryptCryptoKey,
  generateCryptoKey,
  generateSalt,
} from '../src/utils/crypto.ts'

const prisma = new PrismaClient()

async function createUser(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
  roleId: number
) {
  const password_hash = await bcrypt.hash(password, 12)
  const cryptoKeyHex = generateCryptoKey()
  const kek_salt = generateSalt()
  const kek = await deriveKek(password, Buffer.from(kek_salt, 'hex'))
  const encrypted_crypto_key = encryptCryptoKey(cryptoKeyHex, kek)

  return await prisma.users.create({
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
        create: { role_id: roleId },
      },
    },
  })
}

async function main() {
  console.log('🌱 Début du seed...')

  // 1. Rôles
  const adminRole = await prisma.roles.upsert({
    where: { role_id: 1 },
    update: {},
    create: { role: 'Admin' },
  })
  console.log('✅ Rôle ADMIN créé :', adminRole)

  const userRole = await prisma.roles.upsert({
    where: { role_id: 2 },
    update: {},
    create: { role: 'User' },
  })
  console.log('✅ Rôle USER créé :', userRole)

  const demoRole = await prisma.roles.upsert({
    where: { role_id: 3 },
    update: {},
    create: { role: 'Demo' },
  })
  console.log('✅ Rôle DEMO créé :', demoRole)

  // 2. Utilisateur ADMIN
  const admin = await createUser(
    process.env.ADMIN_EMAIL!,
    process.env.ADMIN_FIRSTNAME!,
    process.env.ADMIN_LASTNAME!,
    process.env.ADMIN_PASSWORD!,
    adminRole.role_id
  )
  console.log('✅ Admin créé :', admin)
}

main()
  .catch((e) => {
    console.error('❌ Erreur :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
