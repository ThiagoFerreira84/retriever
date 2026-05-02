// finder/finder.component.ts
// ─────────────────────────────────────────────────────────────
// The most important page in Retriever.
// Opened when someone scans a lost item's QR code.
// Handles all three privacy modes: open, guarded, private.
// ─────────────────────────────────────────────────────────────

import { Component, OnInit }        from '@angular/core'
import { ActivatedRoute }           from '@angular/router'
import { HttpClient }               from '@angular/common/http'
import { CommonModule }             from '@angular/common'
import { FormsModule }              from '@angular/forms'
import { SupabaseService }          from '../shared/services/supabase.service'
import type { PublicItem, RevealResponse, NotifyResponse } from '../shared/types/retriever.types'

type UIState = 'loading' | 'ready' | 'revealing' | 'revealed' | 'sending_note' | 'note_sent' | 'inactive' | 'error'

@Component({
  selector: 'app-finder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finder.component.html',
  styleUrls: ['./finder.component.scss']
})
export class FinderComponent implements OnInit {

  state: UIState = 'loading'
  item: (PublicItem & { active?: boolean }) | null = null
  contact: string | null = null
  finderNote = ''
  errorMessage = ''

  constructor(
    private route:     ActivatedRoute,
    private http:      HttpClient,
    private supabase:  SupabaseService,
  ) {}

  ngOnInit() {
    const tagId = this.route.snapshot.paramMap.get('tagId')
    if (!tagId) { this.state = 'error'; return }

    this.supabase.getPublicItem(tagId).subscribe({
      next: (item: any) => {
        if (!item.active) { this.state = 'inactive'; this.item = item; return }
        this.item  = item
        this.state = 'ready'

        // For open mode, fetch contact immediately via edge function
        if (item.privacy_mode === 'open') {
          this.revealContact(tagId)
        }
      },
      error: () => { this.state = 'error'; this.errorMessage = 'Tag not found.' }
    })
  }

  // ── Guarded: reveal contact on tap ───────────────────────
  onFoundIt() {
    if (!this.item?.tag_id) return
    this.state = 'revealing'
    this.revealContact(this.item.tag_id)
  }

  private revealContact(tagId: string) {
    this.http.post<RevealResponse>(
      `/api/reveal/${tagId}`, {}
    ).subscribe({
      next: ({ contact }) => {
        this.contact = contact
        this.state   = 'revealed'
      },
      error: (err) => {
        this.errorMessage = err.error?.error ?? 'Could not retrieve contact details.'
        this.state = 'error'
      }
    })
  }

  // ── Private: submit finder note ──────────────────────────
  onSendNote() {
    if (!this.item?.tag_id) return
    this.state = 'sending_note'

    this.http.post<NotifyResponse>(
      `/api/notify/${this.item.tag_id}`,
      { note: this.finderNote }
    ).subscribe({
      next: () => { this.state = 'note_sent' },
      error: (err) => {
        this.errorMessage = err.error?.error ?? 'Could not notify the owner.'
        this.state = 'error'
      }
    })
  }

  // ── Template helpers ─────────────────────────────────────
  get isLoading()     { return this.state === 'loading' }
  get isReady()       { return this.state === 'ready' }
  get isRevealing()   { return this.state === 'revealing' }
  get isRevealed()    { return this.state === 'revealed' }
  get isSendingNote() { return this.state === 'sending_note' }
  get isNoteSent()    { return this.state === 'note_sent' }
  get isInactive()    { return this.state === 'inactive' }
  get isError()       { return this.state === 'error' }

  get contactHref(): string {
    if (!this.contact) return '#'
    return this.contact.includes('@')
      ? `mailto:${this.contact}`
      : `tel:${this.contact.replace(/\s/g, '')}`
  }

  get contactLabel(): string {
    if (!this.contact) return ''
    return this.contact.includes('@') ? `Email ${this.contact}` : `Call ${this.contact}`
  }
}
