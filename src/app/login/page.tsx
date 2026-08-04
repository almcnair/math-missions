// ============================================================================
// /login — Landing page. Two doors: student PIN sign-in, teacher magic-link.
// ----------------------------------------------------------------------------
// Students go to /login/student for username + PIN.
// Teachers submit their email on this page; we email them a magic link
// that lands on /auth/callback and drops them in /teacher.
//
// Style is intentionally plain — Math Missions design system doesn't exist
// yet. This is a functional shell; the sped-math-ui pass comes later.
// ============================================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  error?: string;
  sent?: string;
  next?: string;
  email?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, sent, next, email } = await searchParams;
  const nextValue = next && next.startsWith("/") ? next : "";

  // Already signed in? Route them to the right place.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = profile?.role ?? "student";
    const dest =
      nextValue ||
      (role === "teacher" || role === "admin" ? "/teacher" : "/practice");
    redirect(dest);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Math Missions</h1>
          <p className="text-sm text-zinc-600">Sign in to keep going.</p>
        </div>

        {/* Student door */}
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 space-y-2">
          <h2 className="text-lg font-medium text-zinc-900">Student</h2>
          <p className="text-sm text-zinc-600">
            Use the username and PIN your teacher gave you.
          </p>
          <Link
            href={
              nextValue
                ? `/login/student?next=${encodeURIComponent(nextValue)}`
                : "/login/student"
            }
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Student sign-in →
          </Link>
        </div>

        {/* Teacher door */}
        <div className="rounded-md border border-zinc-200 p-4 space-y-3">
          <h2 className="text-lg font-medium text-zinc-900">Teacher</h2>
          <p className="text-sm text-zinc-600">
            Enter your email and we&apos;ll send you a sign-in link.
          </p>

          {sent === "1" ? (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              Check your email for a sign-in link.
            </div>
          ) : (
            <form
              action="/auth/teacher-signin"
              method="post"
              className="space-y-3"
            >
              <input type="hidden" name="next" value={nextValue} />
              <label className="block text-sm font-medium text-zinc-700">
                Email
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={email ?? ""}
                  autoComplete="email"
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Email me a sign-in link
              </button>
            </form>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
