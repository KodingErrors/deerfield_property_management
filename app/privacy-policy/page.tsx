import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Deerfield Deal Desk privacy policy.",
};

const SECTIONS: Array<[title: string, paragraphs: string[]]> = [
  ["Our privacy commitment", [
    "This policy describes how Deerfield Brokerage Inc., Brokerage collects, uses, and protects personal information submitted through its website and this Deal Desk experience. Deerfield does not sell or rent personal information.",
  ]],
  ["Information we collect", [
    "When you contact Deerfield, you may choose to provide your name, email address, telephone number, inquiry type, properties of interest, callback availability, and message. Basic technical information may also be used to operate and secure the website.",
    "Deal Desk search requirements and theme preferences are stored locally in your browser. They are not sent to Deerfield until you choose to review and send an email.",
  ]],
  ["How information is used and shared", [
    "Submitted information may be used to answer an inquiry, provide requested real estate services, maintain business records, and meet legal or regulatory duties. Website inquiries may be processed by service providers that host the website or deliver email. Information may also be disclosed where required by law or with your consent.",
  ]],
  ["Retention and safeguards", [
    "Personal information is retained only as long as reasonably needed for the purposes above. Administrative and technical safeguards are applied according to the sensitivity of the information, although no internet transmission or storage system can be guaranteed completely secure.",
  ]],
  ["Your choices", [
    "You may request access to or correction of personal information held about you, withdraw consent where applicable, or raise a privacy concern. Some records may need to be kept where permitted or required by law.",
  ]],
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <main className="content-page policy-page">
        <section className="page-hero">
          <p className="eyebrow">Your information</p>
          <h1>Privacy <em>Policy.</em></h1>
          <p className="policy-date">Last updated: July 29, 2026</p>
        </section>
        <article className="policy-copy">
          {SECTIONS.map(([title, paragraphs]) => (
            <section key={title}>
              <h2>{title}</h2>
              {paragraphs.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
            </section>
          ))}
          <section>
            <h2>Contact us</h2>
            <p>
              <strong>Deerfield Brokerage Inc., Brokerage</strong><br />
              25 Main Street West, Hamilton, Ontario<br />
              <a href="mailto:info@deerfieldbrokerage.com">info@deerfieldbrokerage.com</a><br />
              <a href="tel:+14162626853">416-262-6853</a>
            </p>
          </section>
        </article>
      </main>
      <SiteFooter
        context="Privacy"
        lines={[
          "Deerfield Brokerage Inc., Brokerage — independently owned and operated. Registered with the Real Estate Council of Ontario and operating in accordance with TRESA and its regulations.",
          "© 2026 Deerfield Brokerage Inc., Brokerage. All rights reserved.",
        ]}
        links={[["Contact", "/contact/"], ["Home", "/"]]}
      />
    </>
  );
}
