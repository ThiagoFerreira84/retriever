// register/register.component.ts
import { ChangeDetectorRef, Component, OnDestroy, OnInit }  from '@angular/core'
import { CommonModule }       from '@angular/common'
import { FormsModule }        from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
import { firstValueFrom }     from 'rxjs'
import { SupabaseService }    from '../shared/services/supabase.service'
import { encryptContact }     from '../shared/utils/crypto.util'
import type { PrivacyMode }   from '../shared/types/retriever.types'
import * as QRCode         from 'qrcode'

type UIState = 'form' | 'saving' | 'done' | 'error'

@Component({
  selector:    'app-register',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls:   ['./register.component.scss'],
})
export class RegisterComponent implements OnInit, OnDestroy {
  state: UIState = 'form'
  private redirectTimer?: number

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
    private cdr:      ChangeDetectorRef,
  ) {}

  ngOnDestroy() {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer)
    }
  }

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
    console.log('Register save started', { itemName: this.itemName, displayName: this.displayName })

    try {
      const encryptedContact = await encryptContact(this.contact)
      console.log('Contact encrypted')

      const item = await firstValueFrom(this.supabase.createItem({
        user_id:       this.userId,
        name:          this.itemName,
        type_emoji:    this.typeEmoji,
        display_name:  this.displayName,
        contact_value: encryptedContact,
        message:       this.message || null,
        privacy_mode:  this.privacyMode,
        active:        true,
      } as any))
      console.log('Item saved', item)

      this.tagId = item.tag_id
      setTimeout(() => {
        this.state = 'done'
        console.log('Register save done state', { isSaving: this.isSaving, isDone: this.isDone })
        this.cdr.detectChanges()

        this.redirectTimer = window.setTimeout(() => {
          console.log('Redirecting to dashboard after save success')
          this.router.navigate(['/dashboard'])
        }, 1200)
      })

      this.generateQR(`${window.location.origin}/t/${item.tag_id}`)
        .then(url => {
          this.qrDataUrl = url
          console.log('QR data set', { qrDataUrl: this.qrDataUrl?.slice(0, 30) })
          setTimeout(() => this.cdr.detectChanges())
        })
        .catch(err => {
          console.error('QR generation failed', err)
          setTimeout(() => {
            this.errorMsg = err?.message ?? 'Could not generate QR code.'
            this.state    = 'error'
            this.cdr.detectChanges()
          })
        })
    } catch (e: any) {
      console.error('Register save failed', e)
      setTimeout(() => {
        this.errorMsg = e?.message ?? 'Could not save item.'
        this.state    = 'error'
        this.cdr.detectChanges()
      })
    }
  }

  private generateQR(url: string): Promise<string> {
    const opts = {
      width: 300,
      margin: 2,
      color: { dark: '#1A1612', light: '#FFFFFF' }
    }

    const result = (QRCode as any).toDataURL(url, opts, (error: any, data?: string) => {
      if (error) throw error
      if (!data) throw new Error('QR generation returned no data')
    })

    if (result && typeof result.then === 'function') {
      return result
    }

    return new Promise((resolve, reject) => {
      try {
        ;(QRCode as any).toDataURL(url, opts, (error: any, data?: string) => {
          if (error) return reject(error)
          if (!data) return reject(new Error('QR generation returned no data'))
          resolve(data)
        })
      } catch (err) {
        reject(err)
      }
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
