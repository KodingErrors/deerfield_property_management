import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { DETAIL_LABELS, formatDetail, imageUrl, properties, TYPE_LABELS, type Property } from "@/lib/catalog";

type Props = { searchParams: Promise<{ id?: string | string[] }> };

async function findProperty({ searchParams }: Props): Promise<Property | undefined> {
  const { id } = await searchParams;
  const wanted = Array.isArray(id) ? id[0] : id;
  return properties.find((property) => property.id === wanted);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const item = await findProperty(props);
  return item
    ? { title: item.name, description: `${TYPE_LABELS[item.type]} property in ${item.city}, Ontario, from Deerfield Brokerage’s portfolio.` }
    : { title: "Property not found" };
}

function humanise(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function PropertyPage(props: Props) {
  const item = await findProperty(props);

  return (
    <>
      <main className="content-page property-detail-page" id="property-detail">
        {item ? <Detail item={item} /> : (
          <section className="not-found">
            <p className="eyebrow">Property not found</p>
            <h1>That listing is not in the portfolio.</h1>
            <Link className="primary-button" href="/properties/">Browse all properties</Link>
          </section>
        )}
      </main>
      <SiteFooter
        context="Property details"
        lines={["Availability and listing information can change without notice and are not guaranteed. Confirm all particulars directly with Deerfield Brokerage."]}
        links={[["All properties", "/properties/"], ["Privacy", "/privacy-policy/"]]}
      />
    </>
  );
}

function Detail({ item }: { item: Property }) {
  const photo = imageUrl(item);
  const knownFeatures = Object.entries(item.features).filter(([, value]) => value === true).map(([key]) => humanise(key));
  const specRows = DETAIL_LABELS
    .map(([key, label]) => [label, formatDetail(key, item.details[key])] as const)
    .filter((row): row is readonly [string, string] => row[1] !== null);
  const overview = item.description || item.details.summary ||
    `${TYPE_LABELS[item.type]} property in ${item.city}, Ontario, represented in Deerfield Brokerage’s public portfolio.`;

  return (
    <>
      <Link className="back-link" href="/properties/">Back to all properties</Link>
      <section className="property-detail-hero">
        <div className={`property-detail-visual ${photo ? "has-photo" : ""}`}>
          {photo ? <img src={photo} alt={item.name} /> : <span>{TYPE_LABELS[item.type]}</span>}
        </div>
        <div className="property-detail-title">
          <p className="eyebrow">{TYPE_LABELS[item.type]} · {item.city}, Ontario</p>
          <h1>{item.name}</h1>
          <div className={`detail-status ${item.available ? "available" : "portfolio"}`}>
            {item.available ? "Space currently listed as available" : "No current space published"}
          </div>
        </div>
      </section>
      <section className="detail-columns">
        <article>
          <p className="eyebrow">Property overview</p>
          <h2>Current listing details.</h2>
          <p>{overview}</p>
          {knownFeatures.length ? (
            <>
              <div className="feature-list">{knownFeatures.map((feature) => <span key={feature}>✓ {feature}</span>)}</div>
              <p className="data-caveat">Feature data is sample data for demonstration and should be confirmed with the broker.</p>
            </>
          ) : (
            <p className="data-caveat">Detailed building features are not published in the source portfolio and should be confirmed with the broker.</p>
          )}
        </article>
        <article>
          <p className="eyebrow">Building details</p>
          <h2>Specifications.</h2>
          {specRows.length ? (
            <dl className="spec-list">
              {specRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          ) : null}
          <p className="data-caveat">Specifications are sample data for demonstration and should be confirmed with the broker.</p>
        </article>
        <article>
          <p className="eyebrow">Available space</p>
          <div className="unit-table-wrap">
            <table className="unit-table">
              <thead><tr><th>Unit</th><th>Size</th><th>Status</th></tr></thead>
              <tbody>
                {item.units.length ? item.units.map((unit) => (
                  <tr key={unit.label}><td>{unit.label}</td><td>{unit.size.toLocaleString("en-CA")} SF</td><td>Listed as available</td></tr>
                )) : (
                  <tr><td colSpan={3}>No suite size is published. Contact Deerfield to confirm current availability and particulars.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
      <section className="detail-actions">
        <div><p className="eyebrow">Interested in this property?</p><h2>Include it in a structured inquiry.</h2></div>
        <div className="cta-pair">
          <Link className="primary-button" href={`/contact/?property=${encodeURIComponent(item.id)}`}>Contact about this property</Link>
          <a className="secondary-link" href="/#finder">Compare matches</a>
        </div>
      </section>
    </>
  );
}
