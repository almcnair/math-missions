# Handoff — policydebate101.com auth persistence bug

_Written for Claude Code, 2026-06-24._

---

## 1. What this site is

**policydebate101.com** is an interactive, gamified learning platform that teaches
policy debate to middle/high school students. It is built for the **Chicago
Debates Summer Institute (CDSI 2026)**, framed in-fiction as the "CDSI Space
Station" — students are **debaters** docking with the station to complete
**missions** (lessons).

### Product goals

- **Students** (called "debaters") log in on Chromebooks, join a class by a
  short code, and play through a linear sequence of missions made of small
  slides (concept slides + 8 CFU types: MCQ, multi-select, sort, order, match,
  fill, label, highlight). They earn XP / rank as they go.
- **Teachers** (called "coaches", primary user: Austin) author missions in an
  in-app **Authoring Studio** at `/author`, assign them to classes, and view
  per-student completion and item analysis. This in-app dashboard is the
  **system of record** — there is no LMS / gradebook integration.
- **Scope for v1:** ~30 students, school-managed Chromebooks, linear missions
  only, no branching/remediation, in-app analytics only.

### Routes (current shape)

- `/` — Public marketing landing page (CDSI Space Station, "outside the ship"
  view). Static HTML rewritten via `next.config.ts` from
  `public/landing/index.html`. Every CTA goes to `/login`.
- `/login` — **Student** sign-in. Three URL-driven steps:
  `/login` → class code; `/login?code=ABC123` → pick name;
  `/login?code=ABC123&student=<uuid>` → enter PIN (or create one on first
  login).
- `/login/teacher` — **Teacher** sign-in (email + password via Supabase Auth).
- `/auth/callback` — OAuth callback (legacy Google SSO path, still wired).
- `/auth/student-signin` — Route handler that does the actual
  `signInWithPassword` for students after they enter their PIN, then
  redirects to `/bridge`.
- `/auth/signout` — POST-only signout, redirects to `/login`.
- `/bridge` — Auth-gated mission picker ("inside the ship"). Shows the
  debater's profile chip + per-mission best stats.
- `/play/[id]` — Auth-gated mission player. Logs CFU attempts and writes
  best-only completion stats server-side.
- `/author` — Authoring Studio for Austin (teacher). Auth-gated.

---

## 2. Where it lives

- **App code:** `~/Desktop/policydebate101-app/`
- **Asset/content folder** (curriculum DOCX, brand guide, glossary):
  `~/Desktop/policydebate101/` — do **not** confuse with the app folder.
- **Saved drafts** from the Authoring Studio:
  `~/Desktop/policydebate101-missions/drafts/`
- **Published missions** (checked into the repo):
  `~/Desktop/policydebate101-app/src/content/missions/`

### Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Supabase (Auth + Postgres + RLS) — project
  `azhwwybmgoxbggwleajm.supabase.co`
- Deploy target: Vercel (domain `policydebate101.com` is owned, not yet
  pointed at prod)
- Local dev: `cd ~/Desktop/policydebate101-app && npx next dev --port 4101`
- npm install workaround: cache permissions are bad —
  `npm install --cache /tmp/npm-cache-pd101`

### Docs to read before changing anything

In `~/Desktop/policydebate101-app/`:

- `README.md` — top-level orientation
- `AGENTS.md` and `CLAUDE.md` — conventions for AI agents working in this
  repo
- `docs/MISSION_SCHEMA.md` — **canonical mission JSON spec**. Read this
  before touching anything in `src/content/missions/`, `src/lib/mission-schema.ts`,
  or the Authoring Studio editors.
- `SUPABASE_SETUP.md` — how the Supabase project is provisioned (env vars,
  Google OAuth, schema)
- `supabase/schema.sql` — full DB schema + RLS policies. The tables that
  matter for auth: `profiles`, `classes`, `enrollments`.

---

## 3. The bug

**Users aren't staying logged in.**

Specifically: a student (or teacher) signs in successfully, lands on
`/bridge`, and then on the next navigation or refresh the middleware
treats them as unauthenticated and bounces them back to `/login`. It
behaves like Supabase's auth cookies aren't persisting reliably across
the request boundary.

The middleware that does the gating is at
`~/Desktop/policydebate101-app/src/middleware.ts`. Note the
`PROTOTYPE_MODE = false` constant near the top — gating is **on** right
now, and this is the path that misbehaves. (Flipping it to `true` makes
everything public and "fixes" the symptom by disabling auth, but that's
obviously not the goal.)

---

## 4. My thoughts on why it's happening

### Suspect #1 — Cookie writes from server actions / server components in Next 16

The codebase already has comments acknowledging this problem in two
places — they are scar tissue from previous flavors of the same bug:

1. **`src/app/auth/callback/route.ts`** — explicitly avoids the shared
   `createClient()` server helper because the comment says
   "`next/headers` cookies() can be unreliable inside a redirect from a
   GET handler". It builds its own request-scoped Supabase client and
   attaches cookies to the redirect response directly.
2. **`src/app/auth/student-signin/route.ts`** — same pattern, with a
   header comment that explicitly says: _"In Next 15+/16, cookies set
   inside a server action immediately followed by `redirect()` are
   unreliable — the `@supabase/ssr` cookieStore writes don't always
   survive the action→redirect→render boundary."_

That tells me the team has already seen this class of bug before and
patched the obvious entry points. My strong suspicion: **the middleware
itself** (`src/middleware.ts`) is now the weak link. It uses
`@supabase/ssr`'s `createServerClient` with a `setAll` that does:

```ts
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
  response = NextResponse.next({ request });
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
},
```

This is the Supabase docs pattern, but it has two known foot-guns in
Next 15/16:

- It reassigns `response = NextResponse.next({ request })` inside
  `setAll`, but the outer middleware function only returns
  `response` on the success path. If `setAll` is called after the
  middleware has already short-circuited to a redirect (e.g. the
  unauthenticated branch), those refreshed cookies never get attached
  to the redirect response. Result: the **refreshed** session token
  Supabase wants to write back is dropped, and on the next request
  the old token is stale → middleware sees no user → redirect to
  `/login`.
- `await supabase.auth.getUser()` is what triggers the refresh-and-
  rotate. If that call happens but the response is then replaced (the
  redirect branch), the rotated cookies are lost.

### Suspect #2 — `cookies()` race in the shared server client

`src/lib/supabase/server.ts` swallows the cookie `set` exception with
an empty `catch {}`:

```ts
try {
  cookiesToSet.forEach(({ name, value, options }) => {
    cookieStore.set(name, value, options);
  });
} catch {
  // Server Component context — middleware will refresh cookies.
}
```

The comment assumes "middleware will refresh cookies", but if the
middleware itself is dropping rotated cookies on redirect (Suspect #1),
no one is left to actually persist the refresh. Server components that
read `auth.getUser()` will silently fail to write back the rotated
token.

### Suspect #3 — Domain/Path/SameSite cookie attributes in dev vs prod

We're running on `http://localhost:4101` in dev. Supabase's default
cookie options are usually fine, but if anything in the
`createServerClient` setup is overriding `sameSite` or `secure`
inconsistently between the middleware, the route handler, and the
server component, browsers will sometimes drop the cookie on
cross-handler navigation. Worth a sanity check that the same options
object is applied everywhere.

### Suspect #4 — `getUser()` vs `getSession()` ordering

Middleware calls `await supabase.auth.getUser()` (correct — `getUser()`
hits the server for verification). But for Next 16, the recommended
shape from the Supabase team is now: **always** call `getUser()` after
constructing the server client *and before* deciding to redirect,
**and** always return the `response` object that `setAll` mutated.
Our current code returns the response on the happy path, but on the
unauthenticated-redirect branch it returns
`NextResponse.redirect(loginUrl)` — a **brand-new** response that has
none of the rotated cookies attached. That's the bug, written out.

### Most likely root cause, ranked

1. **Middleware redirect drops rotated Supabase cookies** (Suspect #1
   + Suspect #4 combined). When an expired-but-rotatable session hits
   middleware, Supabase wants to rotate it; middleware rotates the
   cookies onto `response`, then throws `response` away in favor of a
   redirect — losing the new tokens, so the next request looks
   logged out.
2. Server-component cookie writes silently swallowed (Suspect #2)
   compounding the above.
3. Cookie attribute drift between handlers (Suspect #3) — least
   likely but cheap to verify.

### What I'd try first

In `src/middleware.ts`, when redirecting to `/login` because the user
is unauthenticated, **copy the cookies that `setAll` wrote onto
`response` over to the redirect response** before returning it. Something
like:

```ts
if (!user && !isPublic) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  const redirect = NextResponse.redirect(loginUrl);
  // Preserve any cookies Supabase rotated onto `response`.
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
```

And mirror the same pattern anywhere else middleware returns a non-
`response` value. Then test:

1. Sign in as a student (class code → name → PIN).
2. Land on `/bridge`. Reload. Should stay.
3. Click into `/play/<missionId>`. Reload mid-mission. Should stay.
4. Leave the tab for >1 hour (session approaches refresh window), come
   back, navigate. Should silently rotate and stay signed in.
5. Sign out. Should land on `/login` and `/bridge` should redirect.

Also worth: temporarily logging the cookie names + sizes Supabase is
writing inside `setAll` so you can see whether rotation is firing on
the redirect path.

---

## 5. Files most relevant to the bug

- `src/middleware.ts` — **primary suspect**
- `src/lib/supabase/server.ts` — shared SSR client; check the
  swallowed cookie-write exception
- `src/lib/supabase/client.ts` — browser client (probably fine, but
  verify it's not being used somewhere that should be server-side)
- `src/app/auth/callback/route.ts` — OAuth callback, working
  reference pattern for "attach cookies to redirect response"
- `src/app/auth/student-signin/route.ts` — student PIN sign-in,
  another working reference pattern
- `src/app/auth/signout/route.ts` — uses the shared `createClient()`;
  if signout ever fails to clear cookies, this is the culprit
- `src/app/login/page.tsx` — student login UI (3-step)
- `src/app/login/teacher/page.tsx` — teacher login UI

---

## 6. Things NOT to do

- Don't flip `PROTOTYPE_MODE` to `true` and call it fixed. That just
  disables the gate.
- Don't change the mission JSON schema while fixing this. If something
  in `src/content/missions/*.json` or `src/lib/mission-schema.ts` looks
  wrong, leave it alone — `docs/MISSION_SCHEMA.md` is the source of
  truth and schema changes are out of scope for this handoff.
- Don't touch the Authoring Studio (`src/app/author/*`,
  `src/components/author/*`, `src/lib/author/*`) unless the auth fix
  literally requires it.
- Don't swap the Google OAuth flow for something else; the student
  login path is intentionally PIN-based, and Google SSO is the
  fallback for the teacher path.

---

## 7. RESOLVED — 2026-06-25

Both the suspected cookie bug and a second, unrelated bug were confirmed and
fixed.

**Fix 1 — middleware dropped rotated cookies on redirect (as suspected).**
In `src/middleware.ts`, the unauthenticated branch built a brand-new
`NextResponse.redirect()` and returned it directly, discarding any cookies
Supabase had just rotated onto `response` during `getUser()`. Fixed by
copying `response.cookies.getAll()` onto the redirect response before
returning it — same pattern already used correctly in
`auth/callback/route.ts` and `auth/student-signin/route.ts`.

**Fix 2 — circular RLS policies (not in the original theory, found while
verifying Fix 1).** After fixing the cookie bug, `/bridge` still showed
"Sign In to Board" for fully authenticated students. Root cause: the
`classes` table's SELECT policy queried `enrollments`, and the
`enrollments` table's SELECT policy queried `classes` — evaluating either
one re-triggered the other, causing Postgres error `42P17` ("infinite
recursion detected in policy") on any read that touched either table.
Since `profiles` reads join through `enrollments`/`classes` for the
teacher-visibility policy, this silently broke `auth.getUser()`-then-profile
lookups for everyone, including students reading their own profile —
`/bridge`'s `loadProfile()` got back an error and treated it as "no user",
which looked identical to the cookie bug from the outside.

Fixed via `supabase/migrations/2026-06-24_fix_rls_recursion.sql`: added
`SECURITY DEFINER` helper functions (`is_class_teacher`,
`is_enrolled_in_class`, `is_teacher_of_student`) that read the underlying
tables directly, bypassing RLS internally, and rewrote the 7 affected
policies (on `profiles`, `classes`, `enrollments`, `assignments`,
`attempts`, `completions`) to call them instead of joining the other table
inline. `supabase/schema.sql` was updated to match.

Verified end-to-end via curl against the running dev server (real Supabase
test class `UY9XYF` / student "Daphne Y"): sign in → `/bridge` renders the
full dashboard (welcome header, rank chip, mission path) → three
consecutive reloads all stay authenticated → sign out correctly bounces
back to `/login`.

`PROTOTYPE_MODE` in `src/middleware.ts` remains `false` (auth gating is
on, as it should be).

---

_Bael (Austin's familiar) wrote this. If something here is wrong,
blame me, not Austin._
