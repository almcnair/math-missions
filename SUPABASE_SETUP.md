# Supabase Setup — step by step

You do these steps once. After that, auth + database work everywhere.

Total time: ~15 minutes.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> and sign in (use the Google account you want
   to own this project).
2. Click **New project**.
3. Settings:
   - **Organization:** your personal org (or make one)
   - **Project name:** `policydebate101`
   - **Database password:** click "Generate a password" and **save it in your password manager**. You won't need it day to day, but you'll need it if you ever connect with a SQL client.
   - **Region:** `East US (North Virginia)` (closest to Chicago)
   - **Pricing plan:** Free
4. Click **Create new project**. It takes ~2 minutes to provision.

---

## 2. Run the database schema

1. In the Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **+ New query**.
3. Open this file on your Mac: `~/Desktop/policydebate101-app/supabase/schema.sql`
4. Copy the entire contents and paste into the SQL editor.
5. Click **Run** (bottom right, or `Cmd+Return`).
6. You should see *"Success. No rows returned."*

To verify it worked: click **Table Editor** in the sidebar. You should see
seven tables: `profiles`, `classes`, `enrollments`, `missions`,
`assignments`, `attempts`, `completions`.

---

## 3. Enable Google sign-in

1. In Supabase, click **Authentication** → **Providers** in the sidebar.
2. Find **Google** in the list, click to expand.
3. Flip the toggle to **Enabled**.
4. You need a Google OAuth client ID + secret. Two options:

### Option A — quick (use Supabase's shared OAuth, fine for dev)

Some Supabase plans expose a "use Supabase's OAuth app" option. If you see
it, flip it on and skip to step 5.

### Option B — proper (your own Google OAuth app, recommended for real launch)

1. Go to <https://console.cloud.google.com>.
2. Create a new project named `policydebate101`.
3. In the left sidebar: **APIs & Services** → **OAuth consent screen**.
   - User type: **External**
   - App name: `Policy Debate 101 Academy`
   - User support email: your email
   - Developer contact: your email
   - Save and continue through the next screens (no scopes needed for basic sign-in)
4. **APIs & Services** → **Credentials** → **+ Create credentials** → **OAuth client ID**.
   - Application type: **Web application**
   - Name: `policydebate101 web`
   - **Authorized redirect URI:** paste the **Callback URL** that Supabase shows on the Google provider page (looks like `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`)
   - Click **Create**.
5. Google shows you a **Client ID** and **Client Secret**. Copy both.
6. Paste them into the Supabase Google provider form. Click **Save**.

### 5. URL configuration

Still in Supabase **Authentication**, click **URL Configuration**:

- **Site URL:** `http://localhost:4101`
- **Redirect URLs:** add both:
  - `http://localhost:4101/auth/callback`
  - `https://policydebate101.com/auth/callback`  *(for later when you deploy)*

Click **Save**.

---

## 4. Get your project keys

1. Supabase → **Project Settings** (gear icon, bottom left) → **API**.
2. Copy these two values:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon public** key (long string, starts with `eyJ...`)

---

## 5. Wire them into the app

1. Open `~/Desktop/policydebate101-app/.env.local` (create it if it doesn't exist):
   ```bash
   cp ~/Desktop/policydebate101-app/.env.example ~/Desktop/policydebate101-app/.env.local
   open -e ~/Desktop/policydebate101-app/.env.local
   ```
2. Fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
3. Save.
4. Restart the dev server:
   ```bash
   cd ~/Desktop/policydebate101-app
   lsof -t -nP -iTCP:4101 -sTCP:LISTEN | xargs -r kill -9
   npx next dev --port 4101
   ```

---

## 6. Test it

1. Open <http://localhost:4101>.
2. The middleware should redirect you to `/login`.
3. Click **SIGN IN WITH GOOGLE**.
4. Pick your Google account.
5. You should land back on `/` (the mission picker).
6. To verify a profile row was created: Supabase → **Table Editor** → **profiles**.
   You should see one row with your email and `role = "student"`.

---

## Troubleshooting

**"Auth not configured" notice still shows on /login**
→ The env vars weren't loaded. Make sure `.env.local` is in
`~/Desktop/policydebate101-app/` (not the parent folder) and that you
restarted the dev server.

**Google sign-in returns "redirect_uri_mismatch"**
→ The redirect URI in your Google OAuth client doesn't match the one
Supabase is sending. Copy the exact callback URL Supabase shows you on the
Google provider page into the Google Cloud Console credentials.

**Sign in succeeds but lands on `/login?error=...`**
→ Check the error message in the URL. Usually means the profile row insert
failed (RLS) — but `auth/callback/route.ts` runs with the user's session, so
the `student joins class` policy doesn't apply. If you see this, send me the
error.

**Sign in loops back to /login**
→ Middleware can't read the cookie. Verify you're on `http://localhost:4101`
(not `127.0.0.1:4101` — different cookie origin).



Perfect, you're on the right page. Let's walk through this together.

**Step 1: Fill out this form**

- **Organization:** Policy Debate 101 ✅ (already set)
- **GitHub:** Skip — leave empty. We'll wire git up separately later.
- **Project name:** `policydebate101` ✅ (already set)
- **Database password:** Click **"Generate a password"** (the link on the right). It'll auto-fill a strong one. **CRITICAL: copy it to a password manager or a note immediately.** Supabase won't show it again, and you'll need it if you ever want to connect directly to Postgres. We don't need it for the app itself (the app uses API keys), but losing it = no direct DB access ever.
- **Region:** Click **Americas** and pick the closest one to Texas. **`East US (North Virginia)`** is the safe default for Vercel's default region and gives lowest latency for your students.
- **Security:** Leave both checkboxes ON (Enable Data API + Automatically expose new tables). That's exactly what we want — the app uses the Data API to read/write.

**Step 2:** Scroll down and click **"Create new project"**.

**Step 3:** Supabase will spin it up — takes ~2 minutes. You'll see a loading state. While that's cooking, the next thing we need is:

1. **Project URL** (looks like `https://xxxxxxxxxxxxx.supabase.co`)
2. **anon/public API key** (looks like `eyJhbG...` — long JWT)
3. **service_role key** (also `eyJhbG...` — KEEP SECRET, server-side only)

Once the project is ready, those will be in **Project Settings → API**. Screenshot that page when you get there and I'll tell you exactly which values go where in `.env.local`.


https://azhwwybmgoxbggwleajm.supabase.co

sb_publishable_OZeJdtNSkRi0d4v2VUq_fA_CoHGO2ZA
