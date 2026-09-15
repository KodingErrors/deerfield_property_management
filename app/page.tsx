import type { Metadata } from "next";
import { DISCLAIMER_LINES, SiteFooter } from "@/components/site-footer";
import { DealDesk } from "@/components/wizard/deal-desk";

export const metadata: Metadata = {
  title: { absolute: "Find Your Space | Deerfield Deal Desk" },
};

export default function HomePage() {
  return (
    <>
      <DealDesk />
      <SiteFooter context="Find Your Space" lines={DISCLAIMER_LINES} links={[["Current portfolio", "/properties/"], ["Privacy", "/privacy-policy/"]]} />
    </>
  );
}
