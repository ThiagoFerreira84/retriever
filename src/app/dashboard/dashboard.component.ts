// dashboard/dashboard.component.ts
import { Component, OnInit }    from '@angular/core'
import { CommonModule }         from '@angular/common'
import { Router, RouterModule } from '@angular/router'
import { SupabaseService }      from '../shared/services/supabase.service'
import type { Item, Scan }      from '../shared/types/retriever.types'

@Component({
  selector:    'app-dashboard',
  standalone:  true,
  imports:     [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls:   ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  items:        Item[]  = []
  selectedItem: Item   | null = null
  scans:        Scan[]  = []
  userName      = ''
  loading       = true
  scansLoading  = false

  constructor(
    private supabase: SupabaseService,
    private router:   Router,
  ) {}

  ngOnInit() {
    this.supabase.getUser().subscribe(user => {
      if (!user) { this.router.navigate(['/auth']); return }

      this.supabase.getProfile(user.id).subscribe(p => this.userName = p.name)

      this.supabase.getItems(user.id).subscribe({
        next:  items => { this.items = items; this.loading = false },
        error: ()    => { this.loading = false }
      })
    })
  }

  selectItem(item: Item) {
    this.selectedItem = item
    this.scans        = []
    this.scansLoading = true

    this.supabase.getScans(item.id).subscribe({
      next:  scans => { this.scans = scans; this.scansLoading = false },
      error: ()    => { this.scansLoading = false }
    })
  }

  closeScans() {
    this.selectedItem = null
    this.scans        = []
  }

  toggleActive(item: Item, event: Event) {
    event.stopPropagation()
    this.supabase.updateItem(item.id, { active: !item.active }).subscribe(updated => {
      const i = this.items.findIndex(x => x.id === item.id)
      if (i > -1) this.items[i] = updated
    })
  }

  signOut() {
    this.supabase.signOut().subscribe(() => this.router.navigate(['/auth']))
  }

  qrUrl(item: Item): string {
    return `${window.location.origin}/t/${item.tag_id}`
  }

  // Format scan location
  location(scan: Scan): string {
    return [scan.city, scan.country].filter(Boolean).join(', ') || 'Unknown location'
  }

  // Relative time label
  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins  < 1)   return 'Just now'
    if (mins  < 60)  return `${mins}m ago`
    if (hours < 24)  return `${hours}h ago`
    return `${days}d ago`
  }

  actionLabel(action: string): string {
    const map: Record<string,string> = {
      viewed:   'Viewed',
      revealed: 'Contact revealed',
      notified: 'Owner notified',
    }
    return map[action] ?? action
  }

  actionClass(action: string): string {
    const map: Record<string,string> = {
      viewed:   'neutral',
      revealed: 'success',
      notified: 'info',
    }
    return map[action] ?? 'neutral'
  }

  privacyLabel(mode: string): string {
    const map: Record<string,string> = {
      open:     '🔓 Open',
      guarded:  '🛡 Guarded',
      private:  '🔒 Private',
    }
    return map[mode] ?? mode
  }
}
