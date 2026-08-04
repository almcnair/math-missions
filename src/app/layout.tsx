import type { Metadata } from "next";
import { Chakra_Petch, Rajdhani, JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Display font (2026-07-07): unified with the landing page. Chakra Petch
// was already the wordmark and the landing-page heading font; swapping
// Orbitron -> Chakra Petch here means the whole site speaks with one
// display voice. Orbitron had a heavier geometric feel; Chakra Petch is
// slightly softer, still cyberpunk, and more legible at large sizes.
const chakraPetch = Chakra_Petch({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const rajdhani = Rajdhani({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Reading-optimized humanist body font for long-form prose across the app.
//
// Design decision 2026-07-07: Rajdhani stays on UI (buttons, nav, tags,
// short labels) because its wide condensed forms are recognizable as part
// of the brand. IBM Plex Sans takes over anywhere text runs longer than
// ~1 line — paragraphs, callouts, tool descriptions, italic scripts. Plex
// was picked over Inter because it has a slightly technical/utilitarian
// feel that fits the "policy debate terminal" aesthetic better than Inter.
//
// Both `--font-reading` and `--font-body` point at the same family so the
// existing `.reading-panel` rules in globals.css continue to work; new
// prose classes should reach for `font-body` (Tailwind class) or the CSS
// var directly. Two names, one font, until we can consolidate.
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Math Missions",
  description: "Debate training in space — learn policy debate as a starship debater.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${chakraPetch.variable} ${rajdhani.variable} ${jetbrains.variable} ${ibmPlexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-deep text-text-bright font-ui">
        {/*
          Site-wide navigation progress bar (2026-07-08). Fires on every
          <Link> click so users get instant feedback that navigation is in
          flight, even when the destination page is slow to render. Color
          matches --accent-cyan (#22d3ee); the shadow gives it a subtle
          neon glow consistent with the site aesthetic.
        */}
        <NextTopLoader
          color="#22d3ee"
          height={3}
          showSpinner={false}
          crawlSpeed={200}
          speed={300}
          shadow="0 0 10px #22d3ee, 0 0 5px #22d3ee"
        />
        {children}
        {/*
          Analytics (2026-07-08). Vercel Analytics = cookie-less page-view
          + custom-event tracking (Hobby cap: 2,500 events/mo — see the
          `trackEvent()` helper in src/lib/analytics.ts for throttling).
          Speed Insights = real-user Core Web Vitals (LCP/CLS/INP) on a
          separate quota. Both are privacy-friendly, no PII, no consent
          banner required. Landing page (public/landing/index.html) is
          static HTML and injects the tracker via <script> tag instead.
        */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
