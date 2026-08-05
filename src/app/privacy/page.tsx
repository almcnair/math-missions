// ============================================================================
// /privacy — Public privacy notice
// ----------------------------------------------------------------------------
// Written 2026-07-08 as a companion to the Vercel Analytics rollout. Plain
// language, no legalese, honest about what actually happens on the site.
// Audience: coaches vetting the site for classroom use, parents, and
// occasionally students who click the footer link.
//
// If we ever add third-party services that touch student data (session
// replay, chat widgets, ad networks), this page needs to be updated first.
// ============================================================================

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — Math Missions",
  description:
    "How Math Missions handles data. Cookie-less analytics, no PII, no advertising trackers.",
};

const LAST_UPDATED = "July 8, 2026";
const CONTACT_EMAIL = "amcnair6@cps.edu";

export default function PrivacyPage() {
  return (
    <main className="min-h-full bg-bg-deep text-text-bright font-body">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <p className="font-mono text-xs tracking-[0.2em] text-accent-cyan uppercase mb-3">
            Math Missions
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Privacy
          </h1>
          <p className="text-sm text-text-dim">Last updated {LAST_UPDATED}</p>
        </header>

        <section className="space-y-6 leading-relaxed text-text-bright/90">
          <p>
            Math Missions is built for middle and high school students learning
            policy debate. That means some of our users are minors, and some are
            using this site inside a classroom. We take that seriously. This page
            explains what data we collect, what we don&rsquo;t, and why.
          </p>

          <div>
            <h2 className="font-display text-2xl font-semibold text-accent-cyan mb-3 mt-8">
              What we collect
            </h2>
            <p className="mb-3">
              We use{" "}
              <a
                href="https://vercel.com/docs/analytics"
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent-cyan underline decoration-accent-cyan/40 hover:decoration-accent-cyan"
              >
                Vercel Analytics
              </a>{" "}
              and Vercel Speed Insights to understand how the site is used. This
              gives us:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-text-bright/85">
              <li>Which pages get visited and in what order</li>
              <li>Where visitors came from (search engine, direct link, referring site)</li>
              <li>General device type (phone / tablet / desktop) and browser</li>
              <li>Approximate country/region derived at request time (not stored per user)</li>
              <li>
                A small set of custom events we defined ourselves &mdash; things
                like &ldquo;a lesson deck was opened&rdquo; or &ldquo;a drill was
                completed.&rdquo; This helps us see which parts of the site are
                actually useful.
              </li>
              <li>
                Page performance metrics (how fast the site loads for real users
                on real devices) so we can keep it working well on school
                Chromebooks and phones.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-accent-cyan mb-3 mt-8">
              What we don&rsquo;t collect
            </h2>
            <ul className="list-disc pl-6 space-y-1.5 text-text-bright/85">
              <li>
                <strong>No names, no emails, no identifiers</strong> tied to
                analytics events. Analytics data is aggregated and anonymous.
              </li>
              <li>
                <strong>No cookies for advertising or cross-site tracking.</strong>{" "}
                Vercel Analytics is cookie-less by design.
              </li>
              <li>
                <strong>No IP addresses stored.</strong> IPs are used briefly at
                request time to derive country, then discarded.
              </li>
              <li>
                <strong>No session recording or heatmaps.</strong> We do not watch
                individual users click through the site.
              </li>
              <li>
                <strong>No selling of data.</strong> We don&rsquo;t sell or share
                analytics data with third parties for marketing.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-accent-cyan mb-3 mt-8">
              Accounts and student data
            </h2>
            <p>
              If a coach creates an account, we store their email and role
              (teacher/admin) through our authentication provider (Supabase) so
              they can manage a roster. Student accounts, when created via a
              coach invite, are minimal by design: a display name and a link to
              the coach who invited them. Coursework, drill answers, and any
              in-app activity tied to a signed-in user are kept private to that
              user and their coach.
            </p>
            <p className="mt-3">
              Analytics events described above are <em>never</em> tied to a
              specific student account. When a signed-in student uses the site,
              analytics still only sees anonymous page views and event names.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-accent-cyan mb-3 mt-8">
              Why we track anything at all
            </h2>
            <p>
              This site is built and maintained by one coach. Analytics tell us
              which lessons help, which tools get used, and where students get
              stuck &mdash; so we can build more of what works and fix what
              doesn&rsquo;t. If we couldn&rsquo;t see any of that, we&rsquo;d be
              building in the dark.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-accent-cyan mb-3 mt-8">
              Contact
            </h2>
            <p>
              Questions, concerns, or a request to remove data associated with an
              account?{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-accent-cyan underline decoration-accent-cyan/40 hover:decoration-accent-cyan"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

          <div className="pt-8 mt-8 border-t border-border-faint">
            <Link
              href="/"
              className="text-sm font-mono tracking-wider text-text-dim hover:text-accent-cyan"
            >
              &larr; Back to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
