import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Deerfield Brokerage with a structured commercial property inquiry.",
};

export default function ContactPage() {
  return (
    <>
      <main className="content-page contact-page">
        <section className="page-hero split-hero">
          <div><p className="eyebrow">Contact us</p><h1>Let’s discuss your <em>next move.</em></h1></div>
          <div className="hero-side">
            <p className="hero-kicker">A local path from question to conversation.</p>
            <p>Tell Deerfield what you are looking for, selling, or evaluating. Deal Desk will format your answers into an email you can review before sending.</p>
          </div>
        </section>
        <section className="contact-section">
          <aside className="contact-details">
            <p className="eyebrow">Deerfield Brokerage</p>
            <h2>Get in touch.</h2>
            <dl>
              <div><dt>Office</dt><dd>25 Main Street West<br />Hamilton, Ontario</dd></div>
              <div><dt>Phone</dt><dd><a href="tel:+14162626853">416-262-6853</a></dd></div>
              <div><dt>Email</dt><dd><a href="mailto:info@deerfieldbrokerage.com">info@deerfieldbrokerage.com</a></dd></div>
            </dl>
            <p className="data-caveat">For property availability, include the property name and your approximate size requirement.</p>
          </aside>
          <ContactForm />
        </section>
      </main>
      <SiteFooter
        context="Contact"
        lines={[
          "Review your completed inquiry before it is securely emailed to Deerfield.",
          "Not intended to solicit parties already under contract with another brokerage.",
        ]}
        links={[["Properties", "/properties/"], ["Privacy", "/privacy-policy/"]]}
      />
    </>
  );
}
