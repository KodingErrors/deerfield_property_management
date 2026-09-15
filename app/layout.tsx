import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { THEME_BOOT, THEME_COLORS } from "@/lib/theme";
import "./styles.css";

export const metadata: Metadata = {
  title: { default: "Deerfield Deal Desk", template: "%s | Deerfield Deal Desk" },
  description: "Build your commercial property requirements and compare clear, explainable matches from Deerfield Brokerage.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: the boot script sets data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={THEME_COLORS.light} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
