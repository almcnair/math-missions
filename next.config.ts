import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
