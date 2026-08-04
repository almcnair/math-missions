// ============================================================================
// /practice — Student landing placeholder.
// ----------------------------------------------------------------------------
// This page is a stub — the real practice UI (procgen problems, coins,
// avatars, sessions) is the next big build. For now it just proves the
// auth loop works: student signs in, lands here, sees their name and a
// sign-out button.
// ============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/student?next=/practice");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, coins, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm space-y-4">
          <h1 className="text-3xl font-semibold text-zinc-900">
            Hi, {profile?.display_name ?? "student"} 🪄
          </h1>
          <p className="text-zinc-600">
            Practice is coming soon. This is where the math will live.
          </p>
          <div className="rounded-md bg-zinc-50 border border-zinc-200 p-4 text-sm text-zinc-600">
            <div>username: <span className="font-mono">{profile?.username ?? "—"}</span></div>
            <div>coins: <span className="font-mono">{profile?.coins ?? 0}</span></div>
            <div>role: <span className="font-mono">{profile?.role ?? "—"}</span></div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
