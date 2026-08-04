// ============================================================================
// /login/student — Username + PIN form for students.
// ----------------------------------------------------------------------------
// POSTs to /auth/student-signin. On error, the route redirects back here
// with ?error= and ?u= (preserved username so the student doesn't retype).
// ============================================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  error?: string;
  u?: string;
  next?: string;
}>;

export default async function StudentSignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, u, next } = await searchParams;
  const nextValue = next && next.startsWith("/") ? next : "/practice";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(nextValue);

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Student sign-in</h1>
          <p className="text-sm text-zinc-600">
            Use the username and PIN your teacher gave you.
          </p>
        </div>

        <form action="/auth/student-signin" method="post" className="space-y-4">
          <input type="hidden" name="next" value={nextValue} />

          <label className="block text-sm font-medium text-zinc-700">
            Username
            <input
              type="text"
              name="username"
              required
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              defaultValue={u ?? ""}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            PIN
            <input
              type="password"
              name="pin"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-lg tracking-widest focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="text-center text-sm text-zinc-500">
          <Link href="/login" className="hover:text-zinc-700 underline">
            Not a student?
          </Link>
        </div>
      </div>
    </main>
  );
}
