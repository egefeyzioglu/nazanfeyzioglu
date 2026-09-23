import Link from "next/link";

import SiteActivity from "./_components/SiteActivity";

import { adminSections } from "./_components/navigation";
import { PageHeader } from "./_components/ui";

/** Introduces the store and content workspaces with links to their common tasks. */
export default function AdminIndexPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Overview"
        description="Manage the store or update your website. Choose a workspace to get started."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {adminSections.map((section) => (
          <section
            key={section.label}
            className="border-line rounded-xl border bg-white p-5 sm:p-6"
          >
            <h2 className="font-spectral text-[25px]">{section.label}</h2>
            <p className="text-stone mt-2 font-mono text-[11px] leading-relaxed">
              {section.description}
            </p>
            <div className="mt-6 space-y-2">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-line hover:border-clay focus-visible:outline-clay block rounded-lg border p-4 transition-colors"
                >
                  <div className="text-clay flex items-center justify-between gap-3 text-[16px]">
                    {item.label}
                    <span aria-hidden="true">&rarr;</span>
                  </div>
                  <p className="text-stone mt-2 font-mono text-[11px] leading-relaxed">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="text-stone mt-6 font-mono text-[11px] leading-relaxed">
        Adding an original? Create its artwork in Series &amp; artwork, then set
        its price and availability in Originals. Digital editions are managed
        alongside their artwork in Series &amp; artwork.
      </p>
      <section className="mt-12" aria-label="Site activity">
        <SiteActivity />
      </section>
    </div>
  );
}
