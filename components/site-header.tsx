"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/about/", label: "About", blurb: "Over 40 years of commercial real estate excellence across Southwestern Ontario." },
  { href: "/services/", label: "Services", blurb: "Buyer and seller representation, commercial leasing, and investment advisory." },
  { href: "/properties/", label: "Properties", blurb: "Browse Deerfield’s office, retail, industrial, and in-development portfolio." },
  { href: "/contact/", label: "Contact", blurb: "25 Main Street West, Hamilton · 416-262-6853 · info@deerfieldbrokerage.com" },
];

const SERVICES = [
  ["Buyer Representation", "Acquisition strategy, market analysis and negotiation."],
  ["Seller Representation", "Marketing, qualified buyer access and transaction management."],
  ["Commercial Leasing", "Structured landlord and tenant solutions."],
  ["Investment Advisory", "Market timing and portfolio positioning."],
];

function isActive(pathname: string, href: string) {
  // The property detail page lives under /property/ but belongs to the Properties section.
  if (href === "/properties/") return pathname.startsWith("/propert");
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuClose = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    if (menuOpen) menuClose.current?.focus();
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function closeMenu(restoreFocus = true) {
    setMenuOpen(false);
    if (restoreFocus) menuButton.current?.focus();
  }

  return (
    <>
      <header className="site-header">
        <div className="nav-shell">
          <button
            ref={menuButton}
            className="menu-toggle"
            id="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
          >
            <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
          </button>
          <Link className="wordmark" href="/" aria-label="Deerfield Deal Desk home">
            <span className="mark" aria-hidden="true">D</span>
            <span><strong>Deerfield</strong><small>Deal Desk</small></span>
          </Link>
          <nav className="main-navigation" aria-label="Deerfield Brokerage">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const className = [item.label === "Contact" ? "contact-navigation" : "", active ? "active-link" : ""].filter(Boolean).join(" ") || undefined;
              return (
                <Link key={item.href} href={item.href} className={className} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="nav-actions">
            <a className="nav-cta" href="/#finder">Find a property</a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mobile-navigation-backdrop" id="mobile-navigation-backdrop" hidden={!menuOpen} onClick={() => closeMenu()} />
      <aside
        className="mobile-navigation"
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-navigation-title"
        hidden={!menuOpen}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) closeMenu(false);
        }}
      >
        <header>
          <div>
            <p className="eyebrow">Deerfield Brokerage</p>
            <h2 id="mobile-navigation-title">Explore Deerfield</h2>
          </div>
          <button ref={menuClose} className="menu-close" id="menu-close" type="button" aria-label="Close navigation" onClick={() => closeMenu()}>×</button>
        </header>
        <nav aria-label="Mobile navigation">
          {NAV.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.label === "Contact" ? "mobile-contact-link" : undefined}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><small>{item.blurb}</small>
            </Link>
          ))}
        </nav>
        <section className="mobile-service-list" aria-label="Services offered">
          <p className="eyebrow">Services</p>
          <ul>
            {SERVICES.map(([name, blurb]) => (
              <li key={name}><strong>{name}</strong><span>{blurb}</span></li>
            ))}
          </ul>
        </section>
        <a className="mobile-finder-link" href="/#finder">Start a property search</a>
      </aside>
    </>
  );
}
