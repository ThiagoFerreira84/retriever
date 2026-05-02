// supabase/functions/notify/index.ts
// ─────────────────────────────────────────────────────────────
// Supabase Edge Function — POST /notify/:tag_id
// Private mode: finder submits a note
// → log action: notified
// → email owner with finder's note + location
// → owner's contact is NEVER exposed to finder
//
// Deploy: supabase functions deploy notify
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
    const url   = new URL(req.url)
    const parts = url.pathname.split('/')
    const tagId = parts[parts.length - 1]

    if (!tagId) return json({ error: 'Missing tag_id' }, 400)

    const body = await req.json().catch(() => ({}))
    const note = typeof body.note === 'string' ? body.note.slice(0, 500) : null

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // 1. Fetch item
    const { data: item, error } = await db
      .from('items')
      .select('id, name, type_emoji, privacy_mode, active, user_id')
      .eq('tag_id', tagId)
      .single()

    if (error || !item) return json({ error: 'Tag not found' }, 404)
    if (!item.active)   return json({ error: 'Tag is deactivated' }, 410)
    if (item.privacy_mode !== 'private') return json({ error: 'Not a private tag' }, 400)

    // 2. Log scan
    const ip  = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
    const geo = await geoFromIp(ip)

    await db.from('scans').insert({
      item_id:      item.id,
      action:       'notified',
      privacy_mode: 'private',
      country:      geo.country,
      city:         geo.city,
      user_agent:   req.headers.get('user-agent'),
      finder_note:  note,
    })

    // 3. Email owner (fire-and-forget)
    notifyOwner(db, item, geo, note).catch(() => {})

    return json({ ok: true })

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

async function notifyOwner(db: any, item: any, geo: any, note: string | null) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return

  const { data: user } = await db.auth.admin.getUserById(item.user_id)
  if (!user?.user?.email) return

  const location = [geo.city, geo.country].filter(Boolean).join(', ') || 'unknown location'
  const noteHtml = note
    ? `<blockquote style="border-left:3px solid #C4501A;padding:8px 16px;margin:16px 0;color:#444">${note}</blockquote>`
    : '<p style="color:#999"><em>The finder didn\'t leave a note.</em></p>'

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Retriever <noreply@retriever.app>',
      to:      [user.user.email],
      subject: `Someone found your ${item.type_emoji} ${item.name}!`,
      html: `
        <p>Someone found your <strong>${item.type_emoji} ${item.name}</strong>
           near <strong>${location}</strong>.</p>
        <p>Their note:</p>
        ${noteHtml}
        <p>Your contact details were <strong>not</strong> shared with them.
           Reach out on your own terms.</p>
        <p><a href="https://retriever.app/dashboard"
              style="display:inline-block;padding:12px 20px;background:#1A1612;color:#fff;border-radius:8px;text-decoration:none">
          View scan log →
        </a></p>
        <hr/><p style="color:#999;font-size:12px">Retriever</p>
      `
    })
  })
}
