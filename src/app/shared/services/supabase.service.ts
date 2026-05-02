// shared/services/supabase.service.ts
// ─────────────────────────────────────────────────────────────
// Angular service wrapping the Supabase client.
// Inject this wherever you need DB or auth access.
// ─────────────────────────────────────────────────────────────

import { Injectable } from '@angular/core'
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import { from, Observable, throwError } from 'rxjs'
import { map, catchError } from 'rxjs/operators'
import { environment } from '../../../environments/environment'
import type { Item, PublicItem, Scan, Profile } from '../types/retriever.types'

@Injectable({ providedIn: 'root' })
export class SupabaseService {

  private supabase: SupabaseClient

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    )
  }

  // ── Auth ─────────────────────────────────────────────────

  signUp(email: string, password: string, name: string) {
    return this.supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    })
  }

  signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password })
  }

  signInWithMagicLink(email: string) {
    return this.supabase.auth.signInWithOtp({ email })
  }

  signOut() {
    return from(this.supabase.auth.signOut())
  }

  getUser(): Observable<User | null> {
    return from(this.supabase.auth.getUser()).pipe(
      map(({ data }) => data.user)
    )
  }

  authChanges() {
    return new Observable(subscriber => {
      const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
        (event, session) => subscriber.next({ event, session })
      )
      return () => subscription.unsubscribe()
    })
  }

  // ── Profile ──────────────────────────────────────────────

  getProfile(userId: string): Observable<Profile> {
    return from(
      this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error
        return data as Profile
      })
    )
  }

  updateProfile(userId: string, updates: Partial<Profile>) {
    return from(
      this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
    )
  }

  // ── Items ────────────────────────────────────────────────

  getItems(userId: string): Observable<Item[]> {
    return from(
      this.supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error
        return data as Item[]
      })
    )
  }

  // Fetch only public-safe fields for the finder page (no contact_value)
  getPublicItem(tagId: string): Observable<PublicItem> {
    return from(
      this.supabase
        .from('items')
        .select('name, type_emoji, display_name, message, privacy_mode, tag_id, active')
        .eq('tag_id', tagId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error
        return data as PublicItem & { active: boolean }
      })
    )
  }

  createItem(item: Omit<Item, 'id' | 'created_at' | 'last_scanned_at' | 'tag_id'>): Observable<Item> {
    return from(
      this.supabase
        .from('items')
        .insert(item)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error
        return data as Item
      })
    )
  }

  updateItem(itemId: string, updates: Partial<Item>): Observable<Item> {
    return from(
      this.supabase
        .from('items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error
        return data as Item
      })
    )
  }

  deleteItem(itemId: string) {
    return from(
      this.supabase
        .from('items')
        .update({ active: false })   // soft delete — preserve scan history
        .eq('id', itemId)
    )
  }

  // ── Scans ────────────────────────────────────────────────

  getScans(itemId: string): Observable<Scan[]> {
    return from(
      this.supabase
        .from('scans')
        .select('*')
        .eq('item_id', itemId)
        .order('scanned_at', { ascending: false })
        .limit(50)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error
        return data as Scan[]
      })
    )
  }

  // Log a "viewed" scan — called by finder page on load
  logScan(payload: {
    item_id:      string
    action:       string
    privacy_mode: string
    country?:     string | null
    city?:        string | null
    finder_note?: string | null
  }) {
    return from(this.supabase.from('scans').insert(payload))
  }
}
