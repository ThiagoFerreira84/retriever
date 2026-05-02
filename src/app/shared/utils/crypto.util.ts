// shared/utils/crypto.util.ts
// ─────────────────────────────────────────────────────────────
// Client-side AES-GCM encryption for contact_value.
// The secret key is derived from VITE_CONTACT_ENCRYPT_SECRET
// (set in environment.ts — never exposed in QR or finder page).
// Must match the decryptContact() in the Edge Functions.
// ─────────────────────────────────────────────────────────────

import { environment } from '../../../environments/environment'

const ALGO = 'AES-GCM'

async function getKey(): Promise<CryptoKey> {
  const secret = environment.contactEncryptSecret
  if (!secret) throw new Error('contactEncryptSecret not set in environment')
  const enc = new TextEncoder()
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret))
  return crypto.subtle.importKey('raw', raw, ALGO, false, ['encrypt', 'decrypt'])
}

export async function encryptContact(plain: string): Promise<string> {
  const key = await getKey()
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ct  = await crypto.subtle.encrypt({ name: ALGO, iv }, key, enc.encode(plain))
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2,'0')).join('')
  const ctHex = Array.from(new Uint8Array(ct)).map(b => b.toString(16).padStart(2,'0')).join('')
  return ivHex + ctHex
}
