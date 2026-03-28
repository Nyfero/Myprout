import crypto from 'crypto'

const PBKDF2_ITERATIONS = 310000
const PBKDF2_KEYLEN = 32
const PBKDF2_DIGEST = 'sha256'

// Dérive une clé depuis un mot de passe + salt
export function deriveKek(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEYLEN,
      PBKDF2_DIGEST,
      (err, key) => (err ? reject(err) : resolve(key))
    )
  })
}

// Chiffre la crypto_key avec le KEK
export function encryptCryptoKey(cryptoKeyHex, kek) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv)

  const encrypted = Buffer.concat([
    cipher.update(cryptoKeyHex, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Format stocké : iv:tag:encrypted (tout en hex)
  return [
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

// Déchiffre la crypto_key avec le KEK
export function decryptCryptoKey(encryptedPayload, kek) {
  const [ivHex, tagHex, encryptedHex] = encryptedPayload.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', kek, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8'
  )
}

// Génère une crypto_key aléatoire
export function generateCryptoKey() {
  return crypto.randomBytes(32).toString('hex')
}

// Génère un salt aléatoire
export function generateSalt() {
  return crypto.randomBytes(32).toString('hex')
}
