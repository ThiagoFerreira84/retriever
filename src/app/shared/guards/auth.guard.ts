// shared/guards/auth.guard.ts
import { inject }          from '@angular/core'
import { Router }          from '@angular/router'
import { SupabaseService } from '../services/supabase.service'
import { map, take }       from 'rxjs/operators'

export const authGuard = () => {
  const supabase = inject(SupabaseService)
  const router   = inject(Router)

  return supabase.getUser().pipe(
    take(1),
    map(user => {
      if (user) return true
      router.navigate(['/auth'])
      return false
    })
  )
}
