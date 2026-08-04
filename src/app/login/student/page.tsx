// ============================================================================
// /login/student — Legacy path, redirects to /login.
// ----------------------------------------------------------------------------
// /login is the name + PIN form now (post-2026-07-15 refactor). This route
// exists so any old bookmarks or in-app links to /login/student still work.
// ============================================================================

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function StudentLoginRedirect() {
  redirect("/login");
}
