# 🏋️ Gym Radar — PWA

A gym-management web app: **renewal radar**, members, payments, and an Arabic assistant.
Arabic-first (RTL), **installable (PWA)**, works offline, and white-label (each gym sets its own name, logo, and color). Multi-tenant on Supabase — every gym is fully isolated.

---

## Run locally
Any static file server works (the service worker needs `http://localhost` or HTTPS):
```bash
# inside the gym-radar-pwa folder
python -m http.server 8130
# open http://localhost:8130
```
With no Supabase keys in `js/config.js`, it runs on browser storage with demo data (offline).

---

## Project structure
```
index.html                script load order + app shell
css/app.css               design system (CSS variables drive the white-label theme)
js/
  config.js               ← paste your Supabase URL + anon key here (empty = local mode)
  store.js                data layer (async adapter: LocalAdapter now, SupabaseAdapter when configured)
  supabase-adapter.js     Supabase implementation of the same interface + auth glue
  seed.js                 default plans, settings, message templates, demo data
  domain.js               business logic: subscription status, radar, KPIs, revenue
  bot.js                  the assistant (Arabic normalize + intent matching — NOT an LLM)
  wa.js                   WhatsApp deep links (opens the app; sending stays manual)
  importer.js             member import: Excel / CSV / vCard / JSON
  app.js                  the UI (single-page app): all screens, login, interactions
vendor/xlsx.full.min.js   SheetJS, bundled so Excel import works offline
sw.js                     service worker (offline, stale-while-revalidate)
manifest.webmanifest      install metadata
supabase/
  schema.sql              base tables + RLS + atomic receipt function
  multi-tenant.sql        turns it into isolated per-gym tenants (run AFTER schema.sql)
  anon-testing.sql        TEMPORARY open access for testing without login (remove for real use)
```

**Why it's future-proof:** every read/write goes through `STORE` and returns a Promise. Local today
(`STORE.adapter = new LocalAdapter()`); connecting Supabase is one config change and the UI never changes.

---

## Connect Supabase (one time)
1. In the Supabase dashboard → **SQL Editor**, run in order:
   `supabase/schema.sql` → `supabase/multi-tenant.sql` → `supabase/auto-provision.sql`.
2. Get your **Project URL** and **anon public key** from **Project Settings → API**.
3. Paste them into `js/config.js`:
   ```js
   window.GR_CONFIG = {
     supabaseUrl: 'https://xxxx.supabase.co',
     supabaseAnonKey: 'eyJhbGci...'
   };
   ```
4. In **Authentication → Providers**, turn **off** "Allow new users to sign up" (only you create accounts).

The anon key is meant to be public/shippable — your data is protected by Row-Level Security + login, not by hiding the key.

---

## Multi-tenant (SaaS) — every gym is isolated
Each database row carries a `gym_id` the database fills automatically, and RLS enforces `gym_id = my_gym()`
on every query. So all gyms share one project and the same anon key, but **Gym A can never read Gym B's data** —
the isolation is in the database, not the UI.

### Add a new gym — ONE step
Once `auto-provision.sql` has been run, adding a gym is just:

**Authentication → Users → Add user** → email + password (tick *Auto Confirm User*). Give these to the gym. Done.

A database trigger automatically creates that gym and links the user as **admin** — no SQL per customer.
- To name the gym up front, put `{"gym_name":"Gold's Gym"}` in the **User Metadata** box when adding the user.
- If you skip that, the gym is named after the email prefix, and the owner can rename it in the app's Settings.

> The gym's default plans + settings are created on first login. (The older `new_gym('name','email')` still
> works if you ever want to provision a gym manually from SQL.)

### Check who is linked to what
```sql
select u.email, g.name as gym, s.role
from auth.users u
left join staff s on s.user_id = u.id
left join gyms g on g.id = s.gym_id
order by u.created_at;
```
Any row with a blank `gym` still needs `new_gym(...)`.

### Optional second (reception) account for a gym
Reception cannot see revenue/analytics. Create the user (the trigger gives them a throwaway gym), then
point them at the real gym and set their role:
```sql
update staff set gym_id = '<the-gym-uuid>', role = 'reception'
where user_id = '<reception-user-uuid>';
```
Find the UUIDs with the "check who is linked" query above.

---

## Deploy + custom domain
Publish the `gym-radar-pwa/` folder to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages).
It uses relative paths, so it works from a subfolder too.

- **GitHub Pages:** push the folder → Settings → Pages → Source = `main` / root. To use your domain: Pages →
  Custom domain → enter it, then add a `CNAME` record at your registrar pointing to `<user>.github.io`.
- **Netlify / Vercel:** drag-and-drop or connect the repo, then add your domain in the dashboard and follow its DNS steps.

---

## Features
- **Renewal radar** (expiring soon / expired / owes money) + **revenue-at-risk** + **reminder effectiveness**.
- **Arabic assistant** that answers questions and returns clickable member cards (revenue answers are admin-only).
- **Import** members from Excel / CSV / phone contacts (.vcf) / JSON, with a downloadable template.
- **One-tap WhatsApp** that opens the app with a filled-in message (editable templates).
- **Birthdays this month** and **"attended today but expired"** (attendance module).
- **White-label**: name, logo, 8 preset colors, dark/light — all from Settings.
- **Backup**: one-tap JSON export (important while data lives only in the browser, before Supabase).

---

## Notes
- Numbers and phones render left-to-right inside the Arabic UI; WhatsApp sending is always a manual tap.
- After `multi-tenant.sql` runs, the anon key alone is no longer enough — a login is required (the testing
  hole is closed automatically). Remove the `anon-testing.sql` policies if you ran them.
- Browser-storage (local) mode can be cleared by the browser — use the backup button until you're on Supabase.
