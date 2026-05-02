// auth/auth.component.ts
import { Component }       from '@angular/core'
import { CommonModule }    from '@angular/common'
import { FormsModule }     from '@angular/forms'
import { Router }          from '@angular/router'
import { SupabaseService } from '../shared/services/supabase.service'

type AuthMode = 'signin' | 'signup' | 'magic'
type UIState  = 'idle' | 'loading' | 'sent' | 'error'

@Component({
  selector:    'app-auth',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrls:   ['./auth.component.scss'],
})
export class AuthComponent {
  mode:     AuthMode = 'signin'
  state:    UIState  = 'idle'
  email     = ''
  password  = ''
  name      = ''
  errorMsg  = ''

  constructor(
    private supabase: SupabaseService,
    private router:   Router,
  ) {}

  setMode(m: AuthMode) {
    this.mode    = m
    this.state   = 'idle'
    this.errorMsg = ''
  }

  async onSubmit() {
    this.state    = 'loading'
    this.errorMsg = ''

    try {
      if (this.mode === 'magic') {
        const { error } = await this.supabase.signInWithMagicLink(this.email)
        if (error) throw error
        this.state = 'sent'
        return
      }

      if (this.mode === 'signup') {
        const { error } = await this.supabase.signUp(this.email, this.password, this.name)
        if (error) throw error
        this.state = 'sent'   // prompt to check email for confirmation
        return
      }

      // signin
      const { error } = await this.supabase.signIn(this.email, this.password)
      if (error) throw error
      this.router.navigate(['/dashboard'])

    } catch (e: any) {
      this.errorMsg = e.message ?? 'Something went wrong. Please try again.'
      this.state    = 'error'
    }
  }

  get isLoading() { return this.state === 'loading' }
  get isSent()    { return this.state === 'sent'    }
  get isError()   { return this.state === 'error'   }
  get btnLabel() {
    if (this.isLoading) return 'Please wait…'
    if (this.mode === 'signup') return 'Create account'
    if (this.mode === 'magic')  return 'Send magic link'
    return 'Sign in'
  }
}
