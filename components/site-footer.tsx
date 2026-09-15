import Link from "next/link";

type FooterProps = {
  /** Short page label shown beside the wordmark, e.g. "Property portfolio". */
  context: string;
  lines: string[];
  links: Array<[label: string, href: string]>;
};

export function SiteFooter({ context, lines, links }: FooterProps) {
  return (
    <footer className="legal-footer">
      <div>
        <p><strong>Deerfield Deal Desk</strong> <span>{context}</span></p>
        {lines.map((line) => <p key={line}>{line}</p>)}
      </div>
      <div className="legal-links">
        {links.map(([label, href]) => (
          href.startsWith("/#")
            ? <a key={href} href={href}>{label}</a>
            : <Link key={href} href={href}>{label}</Link>
        ))}
      </div>
    </footer>
  );
}

export const DISCLAIMER_LINES = [
  "Property listings and leasing opportunities are for informational purposes only. Availability is subject to change without notice and does not guarantee a tenancy or transaction. Information is deemed reliable but not guaranteed.",
  "Not intended to solicit buyers, sellers, landlords, or tenants already under contract with another brokerage.",
];
