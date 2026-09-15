import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About",
  description: "Meet Deerfield Brokerage, a Southwestern Ontario commercial real estate team with more than 40 years of experience.",
};

const VALUES = [
  ["Experienced", "Decades of market knowledge guide practical advice, careful analysis, and confident negotiation."],
  ["Reliable", "Clear communication, consistent follow-through, and long-term relationships create trust."],
  ["Driven", "Every opportunity receives focused attention and the persistence needed to reach the right outcome."],
];

// Placeholder names for the demonstration, not Deerfield staff (the page says so).
const TEAM = [
  ["JW", "Jordan Whitfield", "Co-Founder"],
  ["CM", "Casey Marlowe", "Broker of Record"],
  ["RA", "Riley Ashcroft", "Principal"],
  ["MD", "Morgan Deverell", "Salesperson"],
];

export default function AboutPage() {
  return (
    <>
      <main className="content-page about-page">
        <section className="page-hero split-hero">
          <div><p className="eyebrow">About Deerfield Brokerage</p><h1>Experience that moves <em>business forward.</em></h1></div>
          <div className="hero-side">
            <p className="hero-kicker">Over 40 years of commercial real estate excellence.</p>
            <p>Deerfield is a Southwestern Ontario brokerage helping clients acquire, sell, lease, and manage commercial property with clear advice and hands-on service.</p>
          </div>
        </section>

        <section className="story-section">
          <div><p className="eyebrow">Built on expertise</p><h2>A legacy of local knowledge and lasting relationships.</h2></div>
          <div className="prose-stack">
            <p>Deerfield specializes in commercial office, retail, and industrial real estate, as well as residential low-, mid-, and high-rise opportunities across Greater Hamilton and Southwestern Ontario.</p>
            <p>The team’s approach is grounded in three ideas: earn trust, bring disciplined market expertise to every decision, and stay driven from the first conversation through completion.</p>
          </div>
        </section>

        <section className="stats-band" aria-label="Deerfield Brokerage highlights">
          <div><strong>40+</strong><span>Years of experience</span></div>
          <div><strong>500+</strong><span>Transactions</span></div>
          <div><strong>3M+</strong><span>Square feet</span></div>
          <div><strong>100%</strong><span>Commitment</span></div>
        </section>

        <section className="values-section">
          <div className="section-heading"><p className="eyebrow">Our core values</p><h2>The principles behind every deal.</h2></div>
          <div className="value-grid">
            {VALUES.map(([title, copy], index) => (
              <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>
            ))}
          </div>
        </section>

        <section className="team-section">
          <div className="section-heading"><p className="eyebrow">The team</p><h2>Commercial real estate, handled personally.</h2></div>
          <div className="team-grid">
            {TEAM.map(([initials, name, role]) => (
              <article key={name}><span>{initials}</span><h3>{name}</h3><p>{role}</p></article>
            ))}
          </div>
          <p className="data-caveat">Team members shown are placeholder names for this demonstration, not Deerfield staff.</p>
        </section>

        <section className="services-cta">
          <div><p className="eyebrow">Take the next step</p><h2>Start with a property search or a conversation.</h2></div>
          <div className="cta-pair">
            <a className="primary-button" href="/#finder">Find a property</a>
            <Link className="secondary-link" href="/contact/">Contact Deerfield</Link>
          </div>
        </section>
      </main>
      <SiteFooter
        context="About the brokerage"
        lines={[
          "Registered with the Real Estate Council of Ontario. Services are provided in accordance with the Trust in Real Estate Services Act.",
          "Not intended to solicit parties already under contract with another brokerage.",
        ]}
        links={[["Services", "/services/"], ["Privacy", "/privacy-policy/"]]}
      />
    </>
  );
}
