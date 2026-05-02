// shared/types/retriever.types.ts
// ─────────────────────────────────────────────────────────────
// Shared TypeScript types for Retriever (Angular version)
// ─────────────────────────────────────────────────────────────

export type PrivacyMode = 'open' | 'guarded' | 'private'
export type ScanAction  = 'viewed' | 'revealed' | 'notified'

export interface Profile {
  id:           string
  name:         string
  notify_email: boolean
  notify_push:  boolean
  created_at:   string
}

export interface Item {
  id:              string
  user_id:         string
  name:            string
  type_emoji:      string
  display_name:    string
  contact_value:   string
  message:         string | null
  privacy_mode:    PrivacyMode
  tag_id:          string
  active:          boolean
  last_scanned_at: string | null
  created_at:      string
}

// Safe subset shown to finder — no raw contact exposed
export interface PublicItem {
  name:         string
  type_emoji:   string
  display_name: string
  message:      string | null
  privacy_mode: PrivacyMode
  tag_id:       string
}

export interface Scan {
  id:           string
  item_id:      string
  scanned_at:   string
  action:       ScanAction
  privacy_mode: PrivacyMode
  country:      string | null
  city:         string | null
  user_agent:   string | null
  finder_note:  string | null
}

export interface RevealResponse {
  contact: string
}

export interface NotifyResponse {
  ok: boolean
}
