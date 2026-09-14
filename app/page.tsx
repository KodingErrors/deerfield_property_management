import { ArrowRight, Building2, CircleHelp, Factory, Store } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const spaceTypes = [
  {
    label: "Industrial",
    description: "Warehousing, distribution or production",
    icon: Factory,
  },
  {
    label: "Retail",
    description: "Storefront, restaurant or customer-facing space",
    icon: Store,
  },
  {
    label: "Office",
    description: "Professional, medical or administrative space",
    icon: Building2,
  },
  {
    label: "I’m not sure",
    description: "Tell us how you plan to use the space",
    icon: CircleHelp,
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="mx-auto grid w-full max-w-[1520px] gap-12 px-5 pb-20 pt-10 md:px-10 md:pt-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-16 lg:px-14 lg:pt-24">
        <div className="max-w-[36rem] lg:sticky lg:top-32">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Find your space
          </p>
          <h1 className="font-display text-[clamp(3.15rem,7vw,6.8rem)] leading-[0.88] tracking-[-0.055em]">
            A clearer way to find your{" "}
            <em className="font-normal text-primary">next space.</em>
          </h1>
          <p className="mt-8 max-w-[34rem] text-lg leading-8 text-muted-foreground md:text-xl">
            Tell us what your business needs. We’ll separate the essentials from
            the preferences and show how every available property fits.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-6 text-sm text-muted-foreground">
            <div>
              <strong className="block font-display text-2xl font-normal text-foreground">
                29
              </strong>
              Public properties
            </div>
            <div>
              <strong className="block font-display text-2xl font-normal text-foreground">
                3
              </strong>
              Space categories
            </div>
            <div>
              <strong className="block font-display text-2xl font-normal text-foreground">
                2 min
              </strong>
              Guided search
            </div>
          </div>
        </div>

        <section
          aria-labelledby="space-question"
          className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_26px_80px_rgb(30_45_28/0.1)] dark:shadow-[0_28px_90px_rgb(0_0_0/0.28)]"
        >
          <div className="border-b border-border px-6 py-6 sm:px-9 sm:py-8">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="font-display text-2xl tracking-[-0.025em] sm:text-3xl">
                  Build your property search
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your answers stay editable until you contact Deerfield.
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium text-muted-foreground">
                Step 1 of 4
              </p>
            </div>

            <div className="mt-7 grid grid-cols-4 gap-2" aria-hidden="true">
              <span className="h-1.5 rounded-full bg-primary" />
              <span className="h-1.5 rounded-full bg-muted" />
              <span className="h-1.5 rounded-full bg-muted" />
              <span className="h-1.5 rounded-full bg-muted" />
            </div>
          </div>

          <div className="px-6 py-8 sm:px-9 sm:py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              Your space
            </p>
            <h2
              id="space-question"
              className="mt-3 max-w-[34rem] font-display text-[clamp(2.25rem,5vw,3.8rem)] leading-[1.02] tracking-[-0.04em]"
            >
              What kind of space are you looking for?
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Choose the closest fit. You can adjust the details on the next
              screen.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {spaceTypes.map(({ label, description, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="group flex min-h-32 items-start gap-4 rounded-2xl border border-border bg-background p-5 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_10px_30px_rgb(57_83_52/0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
                  </span>
                  <span>
                    <span className="block font-display text-2xl tracking-[-0.02em]">
                      {label}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {description}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-end border-t border-border pt-6">
              <button
                type="button"
                disabled
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground opacity-45"
              >
                Continue
                <ArrowRight aria-hidden="true" size={18} />
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
