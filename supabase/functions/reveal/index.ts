// supabase/functions/reveal/index.ts
// ─────────────────────────────────────────────────────────────
// Supabase Edge Function — POST /reveal/:tag_id
// Guarded mode: finder taps "I found it"
// → decrypt contact_value and return it
// → log action: revealed
// → email the owner
//
// Deploy: supabase functions deploy reveal
// ─────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract tag_id from URL: /reveal/:tag_id
    const url   = new URL(req.url)
    const parts = url.pathname.split('/')
    const tagId = parts[parts.length - 1]

    if (!tagId) {
      return json({ error: 'Missing tag_id' }, 400)
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // 1. Fetch item
    const { data: item, error } = await db
      .from('items')
      .select('id, name, type_emoji, contact_value, privacy_mode, active, user_id')
      .eq('tag_id', tagId)
      .single()

    if (error || !item) return json({ error: 'Tag not found' }, 404)
    if (!item.active)   return json({ error: 'Tag is deactivated' }, 410)
    if (item.privacy_mode !== 'guarded') return json({ error: 'Not a guarded tag' }, 400)

    // 2. Decrypt contact
    const contact = await decryptContact(
      item.contact_value,
      Deno.env.get('CONTACT_ENCRYPT_SECRET')!
    )

    // 3. Log scan
    const ip  = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
    const geo = await geoFromIp(ip)

    await db.from('scans').insert({
      item_id:      item.id,
      action:       'revealed',
      privacy_mode: 'guarded',
      country:      geo.country,
      city:         geo.city,
      user_agent:   req.headers.get('user-agent'),
    })

    // 4. Notify owner (fire-and-forget)
    notifyOwner(db, item, geo, 'revealed').catch(() => {})

    return json({ contact })

  } catch (err) {
    console.error(err)
    return json({ error: 'Internal server error' }, 500)
  }
})

// ── Helpers ──────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function geoFromIp(ip: string) {
  if (!ip || ip === '127.0.0.1') return { country: null, city: null }
  try {
    const res  = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`)
    const data = await res.json()
    return data.status === 'success'
      ? { country: data.country ?? null, city: data.city ?? null }
      : { country: null, city: null }
  } catch {
    return { country: null, city: null }
  }
}

async function decryptContact(cipher: string, secret: string): Promise<string> {
  const enc    = new TextEncoder()
  const keyBuf = await crypto.subtle.digest('SHA-256', enc.encode(secret))
  const key    = await crypto.subtle.importKey('raw', keyBuf, 'AES-GCM', false, ['decrypt'])
  const iv     = new Uint8Array(cipher.slice(0, 24).match(/../g)!.map((h: string) => parseInt(h, 16)))
  const ctBuf  = new Uint8Array(cipher.slice(24).match(/../g)!.map((h: string) => parseInt(h, 16)))
  const plain  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ctBuf)
  return new TextDecoder().decode(plain)
}

async function notifyOwner(db: any, item: any, geo: any, _action: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return

  // Get owner's notification email from profiles
  const { data: profile } = await db
    .from('profiles')
    .select('notify_email')
    .eq('id', item.user_id)
    .single()

  if (!profile?.notify_email) return

  const { data: user } = await db.auth.admin.getUserById(item.user_id)
  if (!user?.user?.email) return

  const location = [geo.city, geo.country].filter(Boolean).join(', ') || 'unknown location'

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Retriever <noreply@retriever.app>',
      to:      [user.user.email],
      subject: `Someone found your ${item.type_emoji} ${item.name}!`,
      html: `
        <p>Someone found your <strong>${item.type_emoji} ${item.name}</strong>!</p>
        <p>They tapped "I found it" from <strong>${location}</strong>.
           Your contact details have been shared with them.</p>
        <p><a href="https://retriever.app/dashboard">View scan log →</a></p>
        <hr/><p style="color:#999;font-size:12px">Retriever</p>
      `
    })
  })
}
