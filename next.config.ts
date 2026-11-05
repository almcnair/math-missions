import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev HMR/resources when accessing the dev server through the OpenClaw
  // portal proxy (127.0.0.1:<random>) instead of localhost:3000. Without this,
  // Next.js 16 blocks the client JS cross-origin and buttons stop working.
  // Dev-only — ignored in production builds.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [
      // Public marketing/landing homepage (static HTML in public/landing/).
      // App routes like /bridge, /play/*, /author, /login keep their behavior.
      { source: "/", destination: "/landing/index.html" },
    ];
  },
  async redirects() {
    return [
      // 2026-07-04: Teacher Moves renamed + un-gated, moved out of /coach.
      // History: /lableaders → /coach/lab-leader → /teacher-moves.
      { source: "/lableaders", destination: "/teacher-moves", permanent: true },
      { source: "/lableaders/:path*", destination: "/teacher-moves", permanent: true },
      { source: "/coach/lab-leader", destination: "/teacher-moves", permanent: true },
      { source: "/coach/lab-leader/:path*", destination: "/teacher-moves", permanent: true },

      // 2026-07-03: /teacher/roster → /coach/roster (consolidated coach namespace)
      { source: "/teacher/roster", destination: "/coach/roster", permanent: true },
      { source: "/teacher", destination: "/coach", permanent: true },
    ];
  },
};

export default nextConfig;
