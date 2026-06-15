// utils/<name>.ts  (ou services/<name>.ts)
//
// TEMPLATE — Module utilitaire / service backend (sans Express).
// Voir CONVENTIONS.md §4 (typage), §5 (structure).
//
// Règles clés :
//  - un .ts est RÉELLEMENT typé : params et retours annotés (à l'inverse de
//    l'actuel utils/crypto.ts qui n'a aucun type)
//  - constantes de module en SCREAMING_SNAKE_CASE en haut
//  - fonctions pures exportées nommées ; pas d'effet de bord caché
//  - pas de any : si la forme est connue, la déclarer

import crypto from 'crypto'

const ITERATIONS = 310000
const KEY_LENGTH = 32
const DIGEST = 'sha256'

/** Dérive une clé depuis un mot de passe et un sel. */
export function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      DIGEST,
      (err, key) => (err ? reject(err) : resolve(key))
    )
  })
}

/** Génère un sel aléatoire encodé en hexadécimal. */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex')
}
</content>
