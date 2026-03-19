import Link from "next/link";
import type { Metadata } from "next";
import { HubspotFormEmbed } from "@/components/hubspot-form-embed";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Courses for Creatives",
  description:
    "Courses, workshops, and bonuses from Erin and Steve at Superabound.",
};

const FORM_ID = process.env.NEXT_PUBLIC_HUBSPOT_FORM_ID ?? "";
const PORTAL_ID = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID ?? "";
const HUBSPOT_REGION = process.env.NEXT_PUBLIC_HUBSPOT_REGION ?? "na1";

const landingPageContent = {
  eyebrow: "Courses for Creatives",
  brandNote: "by Erin and Steve at Superabound",
  heroHeadline: "Finally, a course platform that feels like home.",
  heroBody:
    "Everything you need. None of the extras you don’t. At a price that makes sense. You shouldn’t have to overpay for a complicated platform just to share your work. Courses for Creatives is the simple, affordable alternative to the big name vendors. Designed by coaches for creatives who want to focus on teaching, not fighting with software.",
  formEyebrow: "Request access",
  formTitle: "Request Access & Claim Your Migration",
  formBody:
    "We are opening the doors to only 10 creatives this month so everyone gets personal attention. If you’re ready to move, we’ll do the heavy lifting. Join the first 10 and we will migrate your entire course from your current platform for free. Enter your details below to see if we’re a fit.",
  offerEyebrow: "The Fresh Start Offer",
  offerTitle: "Free migration for the first 10 creatives this month",
  offerBody:
    "We’re keeping this first group intentionally small so every new customer gets personal attention. If you’re ready to move, we’ll handle the migration work and get your course into the new system without the usual platform mess.",
  cards: [
    {
      eyebrow: "What you get",
      title: "Simple and Focused",
      body: "A clean library for your classes, workshops, and bonuses.",
    },
    {
      eyebrow: "What you get",
      title: "A Fair Price",
      body:
        "Professional hosting and delivery without the high monthly overhead.",
    },
    {
      eyebrow: "What you get",
      title: "Human Support",
      body:
        "No bots or endless ticket loops. It’s just us, making sure you and your students are taken care of.",
    },
  ],
} as const;

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const libraryHref = user ? "/library" : "/login";

  return (
    <main className="marketing-shell">
      <header className="marketing-topbar">
        <div>
          <p className="eyebrow">{landingPageContent.eyebrow}</p>
          <p className="marketing-brand-note">{landingPageContent.brandNote}</p>
        </div>
        <div className="page-actions">
          <Link className="button button-secondary" href={libraryHref}>
            {user ? "Open your library" : "Log in"}
          </Link>
          <a className="button" href="#get-access">
            Get access
          </a>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <h1>{landingPageContent.heroHeadline}</h1>
          <p className="marketing-lede">{landingPageContent.heroBody}</p>
        </div>
        <section className="panel marketing-hero-card">
          <p className="eyebrow">{landingPageContent.formEyebrow}</p>
          <h2>{landingPageContent.formTitle}</h2>
          <p className="marketing-form-intro">{landingPageContent.formBody}</p>
          {FORM_ID && PORTAL_ID ? (
            <HubspotFormEmbed
              formId={FORM_ID}
              portalId={PORTAL_ID}
              region={HUBSPOT_REGION}
            />
          ) : (
            <div className="marketing-form-fallback">
              <p>HubSpot form is not configured yet.</p>
              <p>
                Set <code>NEXT_PUBLIC_HUBSPOT_PORTAL_ID</code> and{" "}
                <code>NEXT_PUBLIC_HUBSPOT_FORM_ID</code> in Vercel to show the form here.
              </p>
            </div>
          )}
        </section>
      </section>

      <section className="panel marketing-offer-panel">
        <div>
          <p className="eyebrow">{landingPageContent.offerEyebrow}</p>
          <h2>{landingPageContent.offerTitle}</h2>
        </div>
        <p>{landingPageContent.offerBody}</p>
      </section>

      <section className="marketing-grid">
        {landingPageContent.cards.map((card) => (
          <article key={card.title} className="panel marketing-card">
            <p className="eyebrow">{card.eyebrow}</p>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <footer className="marketing-footer">
        <img
          alt="Superabound Coaching"
          className="marketing-footer-logo"
          src="/superabound-coaching-logo.png"
        />
      </footer>
    </main>
  );
}
