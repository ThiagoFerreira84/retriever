// register/register.component.ts
import { Component, OnInit }  from '@angular/core'
import { CommonModule }       from '@angular/common'
import { FormsModule }        from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
import { SupabaseService }    from '../shared/services/supabase.service'
import { encryptContact }     from '../shared/utils/crypto.util'
import type { PrivacyMode }   from '../shared/types/retriever.types'

type UIState = 'form' | 'saving' | 'done' | 'error'

@Component({
  selector:    'app-register',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls:   ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  state: UIState = 'form'

  // Form fields
  itemName     = ''
  typeEmoji    = '📦'
  displayName  = ''
  contact      = ''
  message      = ''
  privacyMode: PrivacyMode = 'guarded'

  // After save
  tagId        = ''
  qrDataUrl    = ''
  errorMsg     = ''

  userId = ''

  emojiOptions = [
    { value: '🔑', label: '🔑 Keys' },
    { value: '🎒', label: '🎒 Bag / backpack' },
    { value: '👛', label: '👛 Wallet' },
    { value: '📱', label: '📱 Phone / device' },
    { value: '🐶', label: '🐶 Pet tag' },
    { value: '🧳', label: '🧳 Luggage' },
    { value: '📦', label: '📦 Other' },
  ]

  privacyOptions: { value: PrivacyMode; label: string; desc: string }[] = [
    { value: 'open',    label: '🔓 Open',    desc: 'Contact shown immediately' },
    { value: 'guarded', label: '🛡 Guarded', desc: 'Finder taps to reveal (recommended)' },
    { value: 'private', label: '🔒 Private', desc: 'You contact the finder' },
  ]

  constructor(
    private supabase: SupabaseService,
    private router:   Router,
  ) {}

  ngOnInit() {
    this.supabase.getUser().subscribe(user => {
      if (!user) { this.router.navigate(['/auth']); return }
      this.userId      = user.id
      // Pre-fill display name from profile
      this.supabase.getProfile(user.id).subscribe(p => {
        if (!this.displayName) this.displayName = p.name
      })
    })
  }

  async onSave() {
    if (!this.itemName || !this.displayName || !this.contact) return
    this.state = 'saving'

    try {
      // Encrypt contact before sending to DB
      const encryptedContact = await encryptContact(this.contact)

      this.supabase.createItem({
        user_id:       this.userId,
        name:          this.itemName,
        type_emoji:    this.typeEmoji,
        display_name:  this.displayName,
        contact_value: encryptedContact,
        message:       this.message || null,
        privacy_mode:  this.privacyMode,
        active:        true,
      } as any).subscribe({
        next: async (item) => {
          this.tagId    = item.tag_id
          this.qrDataUrl = await this.generateQR(`${window.location.origin}/t/${item.tag_id}`)
          this.state    = 'done'
        },
        error: (e) => {
          this.errorMsg = e.message ?? 'Could not save item.'
          this.state    = 'error'
        }
      })
    } catch (e: any) {
      this.errorMsg = e.message ?? 'Encryption failed.'
      this.state    = 'error'
    }
  }

  private generateQR(url: string): Promise<string> {
    return new Promise((resolve) => {
      // Dynamically import qrcode to keep bundle small
      import('qrcode').then(QRCode => {
        QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          color: { dark: '#1A1612', light: '#FFFFFF' }
        }).then(resolve)
      })
    })
  }

  printTag() {
    const w = window.open('', '_blank')!
    w.document.write(`
      <html><head><title>Retriever tag — ${this.itemName}</title>
      <style>
        body { font-family: Georgia, serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#fff; }
        .tag { border: 2px dashed #ccc; border-radius: 16px; padding: 24px 28px; text-align:center; width:220px; }
        img  { width:180px; height:180px; display:block; margin:0 auto 12px; }
        h2   { font-size:16px; margin:0 0 4px; }
        p    { font-size:12px; color:#666; margin:0; }
        .scan{ font-size:11px; color:#999; margin-top:10px; border-top:1px solid #eee; padding-top:8px; }
      </style></head>
      <body><div class="tag">
        <img src="${this.qrDataUrl}" />
        <h2>${this.typeEmoji} ${this.itemName}</h2>
        <p>${this.displayName}</p>
        <div class="scan">Scan to return this item</div>
      </div>
      <script>window.onload=()=>{window.print()}<\/script>
      </body></html>
    `)
    w.document.close()
  }

  get isForm()   { return this.state === 'form'  || this.state === 'error' }
  get isSaving() { return this.state === 'saving' }
  get isDone()   { return this.state === 'done'   }
}
