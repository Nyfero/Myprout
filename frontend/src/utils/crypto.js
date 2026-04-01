// src/utils/crypto.js

const hexToBytes = (hex) =>
  Uint8Array.from(hex.match(/.{1,2}/g).map((b) => parseInt(b, 16)))

const bytesToHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

// Dériver la KEK depuis le mot de passe + salt
export const deriveKek = async (password, saltHex) => {
  const encoder = new TextEncoder()

  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex),
      iterations: 310000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Chiffre la crypto_key avec le KEK
export const encryptCryptoKey = async (cryptoKeyHex, kek) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const keyBytes = hexToBytes(cryptoKeyHex)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    kek,
    keyBytes
  )

  const encryptedBytes = new Uint8Array(encrypted)
  const tag = encryptedBytes.slice(-16)
  const ciphertext = encryptedBytes.slice(0, -16)

  return [bytesToHex(iv), bytesToHex(tag), bytesToHex(ciphertext)].join(':')
}

// Déchiffrer la crypto_key avec la KEK
export const decryptCryptoKey = async (encryptedPayload, kek) => {
  const [ivHex, tagHex, encryptedHex] = encryptedPayload.split(':')

  const iv = hexToBytes(ivHex)
  const tag = hexToBytes(tagHex)
  const encrypted = hexToBytes(encryptedHex)

  const encryptedWithTag = new Uint8Array(encrypted.byteLength + tag.byteLength)
  encryptedWithTag.set(encrypted, 0)
  encryptedWithTag.set(tag, encrypted.byteLength)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    kek,
    encryptedWithTag
  )

  return bytesToHex(new Uint8Array(decrypted))
}

// Importer la crypto_key (hex) en objet CryptoKey WebCrypto
export const importCryptoKey = async (cryptoKeyHex) => {
  const keyBytes = hexToBytes(cryptoKeyHex)
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

// Chiffrer un mot de passe avec la crypto_key
export const encryptPassword = async (text, cryptoKey) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  )

  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.byteLength)

  return btoa(String.fromCharCode(...combined))
}

// Déchiffrer un mot de passe avec la crypto_key
export const decryptPassword = async (encryptedBase64, cryptoKey) => {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) =>
    c.charCodeAt(0)
  )
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  )

  return new TextDecoder().decode(decrypted)
}
export const unlockCryptoKey = async (
  password,
  kek_salt,
  encrypted_crypto_key
) => {
  const kek = await deriveKek(password, kek_salt)
  const cryptoKeyHex = await decryptCryptoKey(encrypted_crypto_key, kek)
  return importCryptoKey(cryptoKeyHex)
}
