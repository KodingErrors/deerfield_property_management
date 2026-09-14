import { Building } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[1600px] items-center justify-between rounded-2xl border border-border bg-background/88 px-4 shadow-[0_12px_40px_rgb(34_44_31/0.08)] backdrop-blur-xl dark:shadow-[0_12px_40px_rgb(0_0_0/0.25)] sm:px-6">
        <a
          href="/"
          aria-label="Deerfield Deal Desk home"
          className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-accent text-primary">
            <Building aria-hidden="true" size={18} strokeWidth={1.7} />
          </span>
          <span>
            <span className="block font-display text-lg leading-none tracking-[-0.02em] sm:text-xl">
              Deerfield
            </span>
            <span className="mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Deal Desk
            </span>
          </span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="#space-question"
            className="hidden min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:inline-flex"
          >
            Find a property
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
