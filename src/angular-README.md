# Retriever — Angular Setup Guide

## File structure

```
retriever-angular/
├── supabase/
│   └── functions/
│       ├── reveal/index.ts     ← Edge function: guarded mode reveal
│       └── notify/index.ts     ← Edge function: private mode notify
└── src/
    ├── environments/
    │   └── environment.ts      ← Add your Supabase keys here
    └── app/
        ├── app.routes.ts       ← Router config
        ├── finder/
        │   ├── finder.component.ts
        │   ├── finder.component.html
        │   └── finder.component.scss
        └── shared/
            ├── services/
            │   └── supabase.service.ts
            └── types/
                └── retriever.types.ts
```

---

## Step 1 — Bootstrap Angular project

```bash
ng new retriever --routing --style=scss --standalone
cd retriever
npm install @supabase/supabase-js
```

---

## Step 2 — Copy in the files

Drop each file from this folder into your Angular project at the matching path.

---

## Step 3 — Add your Supabase keys

Edit `src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  supabaseUrl:     'https://rkbjpzmqlqcrlcokupis.supabase.co',
  supabaseAnonKey: 'sb_publishable_OUBOHeWMB3A4uX3xjjOlpw_UF05sOzO',
}

```

---

## Step 4 — Configure app.config.ts

```ts
// src/app/app.config.ts
import { ApplicationConfig }    from '@angular/core'
import { provideRouter }        from '@angular/router'
import { provideHttpClient }    from '@angular/common/http'
import { routes }               from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
  ]
}
```

---

## Step 5 — Proxy API calls to Edge Functions (local dev)

Create `proxy.conf.json` in the project root:
{
  "/api/reveal": {
    "target": "https://rkbjpzmqlqcrlcokupis.supabase.co/functions/v1",
    "secure": true,
    "changeOrigin": true,
    "pathRewrite": { "^/api/reveal": "/reveal" }
  },
  "/api/notify": {
    "target": "https://rkbjpzmqlqcrlcokupis.supabase.co/functions/v1",
    "secure": true,
    "changeOrigin": true,
    "pathRewrite": { "^/api/notify": "/notify" }
  }
}
```

Add to `angular.json` under `serve > options`:
```json
"proxyConfig": "proxy.conf.json"
```

---

## Step 6 — Deploy Edge Functions

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login and link to your project Terminal
supabase login
supabase link --project-ref rkbjpzmqlqcrlcokupis

# Set secrets (same as .env values)
supabase secrets set CONTACT_ENCRYPT_SECRET=your_secret
supabase secrets set RESEND_API_KEY=your_resend_key

# Deploy both functions
supabase functions deploy reveal
supabase functions deploy notify
```

---

## Step 7 — Run locally

```bash
ng serve
```

Visit `http://localhost:4200/t/testkeys` — add a test row in Supabase first (see main README).

---

## Step 8 — Deploy to production

Angular builds to static files — deploy anywhere:
```bash
ng build --configuration production
```

Good options: **Netlify**, **Vercel**, or **Firebase Hosting** (natural fit if you ever add more Google services). All are free to start.

---

## What to build next

1. **Home page** (`/`) — landing + registration form with QR generation
2. **Auth** — sign up / login using `SupabaseService.signIn()`
3. **Dashboard** (`/dashboard`) — list items, see scan logs per item
4. **AuthGuard** — protect dashboard route
5. **Item form** — create/edit items with privacy mode picker
