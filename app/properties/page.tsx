import type { Metadata } from "next";
import { Portfolio } from "@/components/portfolio";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Properties",
  description: "Browse Deerfield Brokerage’s office, retail, industrial and in-development portfolio across Ontario.",
};

export default function PropertiesPage() {
  return (
    <>
      <main className="content-page properties-page">
        <section className="page-hero split-hero">
          <div><p className="eyebrow">Our portfolio</p><h1>Commercial properties across <em>Ontario.</em></h1></div>
          <div className="hero-side">
            <p className="hero-kicker">29 properties. One local, searchable portfolio.</p>
            <p>Review Deerfield’s office, retail, industrial, and in-development properties, then use Deal Desk to build a requirements-based shortlist.</p>
          </div>
        </section>
        <Portfolio />
        <section className="services-cta">
          <div><p className="eyebrow">Need a focused shortlist?</p><h2>Rank what matters and compare your best matches.</h2></div>
          <a className="primary-button" href="/#finder">Open Deal Desk</a>
        </section>
      </main>
      <SiteFooter
        context="Property portfolio"
        lines={[
          "Property listings are informational only. Availability is subject to change without notice. Information is deemed reliable but not guaranteed.",
          "Not intended to solicit parties already under contract with another brokerage.",
        ]}
        links={[["Contact", "/contact/"], ["Privacy", "/privacy-policy/"]]}
      />
    </>
  );
}
