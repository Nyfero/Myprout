import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import {
  deriveKek,
  encryptCryptoKey,
  generateCryptoKey,
  generateSalt,
} from '../src/utils/crypto.ts'
import { webcrypto } from 'crypto'

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

  const existing = await prisma.users.findFirst({ where: { email } })

  const user = existing
    ? existing
    : await prisma.users.create({
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

  const importedKey = await importCryptoKeyNode(cryptoKeyHex)
  return { user, cryptoKey: importedKey }
}

const encryptPasswordNode = async (
  text: string,
  cryptoKey: webcrypto.CryptoKey
): Promise<string> => {
  const iv = webcrypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)

  const encrypted = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  )

  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.byteLength)

  return Buffer.from(combined).toString('base64')
}

const importCryptoKeyNode = async (
  cryptoKeyHex: string
): Promise<webcrypto.CryptoKey> => {
  const keyBytes = Buffer.from(cryptoKeyHex, 'hex')
  return webcrypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
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
  const { user: admin } = await createUser(
    process.env.ADMIN_EMAIL!,
    process.env.ADMIN_FIRSTNAME!,
    process.env.ADMIN_LASTNAME!,
    process.env.ADMIN_PASSWORD!,
    adminRole.role_id
  )
  console.log('✅ Admin créé :', admin)

  // 3. Utilisateur DEMO
  const { user: demo, cryptoKey: demoCryptoKey } = await createUser(
    process.env.DEMO_EMAIL!,
    process.env.DEMO_FIRSTNAME!,
    process.env.DEMO_LASTNAME!,
    process.env.DEMO_PASSWORD!,
    demoRole.role_id
  )
  console.log('✅ Demo créé :', demo)

  const demoPasswords = [
    {
      title: 'Google',
      username: 'demo@gmail.com',
      password: 'Google1234!',
      note: 'Compte Google demo',
    },
    {
      title: 'GitHub',
      username: 'demo-user',
      password: 'Github1234!',
      note: 'Compte GitHub demo',
    },
    {
      title: 'Netflix',
      username: 'demo@gmail.com',
      password: 'Netflix1234!',
      note: null,
    },
  ]

  for (const p of demoPasswords) {
    await prisma.passwords.create({
      data: {
        user_id: demo.user_id,
        title: p.title,
        username: p.username,
        password: await encryptPasswordNode(p.password, demoCryptoKey),
        note: p.note,
      },
    })
  }
  console.log('✅ Mots de passe démo créés')
}

main()
  .catch((e) => {
    console.error('❌ Erreur :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
