import type { Metadata } from "next";
import { DISCLAIMER_LINES, SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Services",
  description: "Buyer and seller representation, commercial leasing, and investment advisory from Deerfield Brokerage.",
};

const SERVICES = [
  {
    id: "buyer-representation",
    audience: "For purchasers",
    title: "Buyer Representation",
    copy: "A commercial acquisition can be one of the largest commitments a business or investor makes. Deerfield acts as an experienced advocate from the first opportunity review through closing—researching the market, testing properties against your criteria, coordinating diligence, and negotiating the transaction.",
    points: [
      "Market research and property identification",
      "Financial analysis and investment modelling",
      "Due diligence coordination and management",
      "Offer preparation and negotiation",
      "Transaction management through closing",
    ],
  },
  {
    id: "seller-representation",
    audience: "For owners",
    title: "Seller Representation",
    copy: "Strong disposition outcomes begin with positioning, not simply placing a listing. Deerfield builds a strategy for the asset, presents it professionally, reaches qualified buyers, and manages offers and negotiations through a coordinated closing process.",
    points: [
      "Comprehensive property valuation and pricing strategy",
      "Targeted marketing and buyer outreach",
      "Professional presentation and listing management",
      "Offer review, negotiation, and counter-offer strategy",
      "End-to-end transaction management",
    ],
  },
  {
    id: "commercial-leasing",
    audience: "For landlords and tenants",
    title: "Commercial Leasing",
    copy: "Finding the right tenant—or the right business location—takes market knowledge, negotiation skill, and a broad network. Deerfield represents landlords and tenants across Southwestern Ontario and connects operational needs with suitable office, retail, and industrial opportunities.",
    points: [
      "Office, retail, and industrial leasing",
      "Landlord representation and tenant sourcing",
      "Tenant representation and site selection",
      "Lease negotiation and renewal advisory",
      "Market comparables and rental-rate analysis",
    ],
  },
  {
    id: "investment-advisory",
    audience: "For investors",
    title: "Investment Advisory",
    copy: "Commercial property decisions reward a long-term view, disciplined timing, and clear risk-and-return analysis. Deerfield supports first-time and experienced investors with the market intelligence and analytical rigour needed to build, assess, and reposition a portfolio.",
    points: [
      "Portfolio assessment and strategy development",
      "Market entry and exit timing analysis",
      "Property performance and asset-management guidance",
      "Capitalization-rate analysis and return modelling",
      "1031 exchange and disposition planning",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      <main className="services-page">
        <section className="services-hero" aria-labelledby="services-title">
          <div>
            <p className="eyebrow">What we offer</p>
            <h1 id="services-title">Our <em>Services.</em></h1>
          </div>
          <p>Experienced representation for buyers, sellers, landlords, tenants, and commercial real estate investors across Southwestern Ontario.</p>
        </section>

        <section className="services-overview" id="services-overview" aria-labelledby="services-overview-title">
          <p className="eyebrow">Full-service brokerage</p>
          <h2 id="services-overview-title">Helping you achieve your commercial investment goals.</h2>
          <p>Deerfield combines detailed market knowledge with hands-on transaction support to help buyers and sellers protect value at every stage of a commercial real estate decision.</p>
          <nav className="service-jump-links" aria-label="Jump to a service">
            {SERVICES.map((service, index) => (
              <a key={service.id} href={`#${service.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{service.title}</a>
            ))}
          </nav>
        </section>

        <section className="service-details" aria-label="Deerfield service details">
          {SERVICES.map((service, index) => (
            <article className="service-detail" id={service.id} key={service.id}>
              <div className="service-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
              <div className="service-copy">
                <p className="eyebrow">{service.audience}</p>
                <h2>{service.title}</h2>
                <p>{service.copy}</p>
                <ul>{service.points.map((point) => <li key={point}>{point}</li>)}</ul>
              </div>
            </article>
          ))}
        </section>

        <section className="services-cta" aria-labelledby="services-cta-title">
          <div>
            <p className="eyebrow">Find your space</p>
            <h2 id="services-cta-title">Turn your requirements into a focused shortlist.</h2>
          </div>
          <a className="primary-button" href="/#finder">Start a property search</a>
        </section>
      </main>
      <SiteFooter
        context="Commercial real estate services"
        lines={DISCLAIMER_LINES}
        links={[["Find a property", "/#finder"], ["Privacy", "/privacy-policy/"]]}
      />
    </>
  );
}
