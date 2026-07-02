import Sidebar from "src/app/_components/Sidebar";
import { getContent, getExhibitionGroups } from "src/server/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Exhibitions — Nazan Feyzioğlu" };

export default async function ExhibitionsPage() {
  const [groups, content] = await Promise.all([
    getExhibitionGroups(),
    getContent(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink md:flex-row">
      <Sidebar active="exhibitions" />

      <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:min-w-0 md:max-w-[1080px] md:px-[72px] md:pt-16">
        <div className="font-mono text-[10.5px] tracking-[0.3em] text-ash uppercase">
          Exhibitions
        </div>
        <h1 className="mt-[18px] text-[44px] leading-[1.1] font-light tracking-[-0.015em]">
          {content["exhibitions.heading"]}
        </h1>

        <div className="mt-[54px] flex max-w-[680px] flex-col gap-14">
          {groups.map((group) => (
            <section key={group.category}>
              <div className="border-b border-line pb-[18px] font-mono text-[11px] tracking-[0.26em] text-clay uppercase">
                {group.heading}
              </div>
              <div className="flex flex-col">
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-6 border-b border-line-soft py-5"
                  >
                    <div>
                      <div className="font-spectral text-[22px] leading-[1.2] italic">
                        {entry.name}
                      </div>
                      <div className="mt-[7px] font-mono text-[11px] tracking-[0.04em] text-stone-2">
                        {entry.location}
                      </div>
                    </div>
                    <div className="font-mono text-[11px] tracking-[0.1em] whitespace-nowrap text-ash uppercase">
                      {entry.date}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
