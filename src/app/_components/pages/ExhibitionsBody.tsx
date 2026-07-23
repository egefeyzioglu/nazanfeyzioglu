"use client";

import { EditableText } from "src/app/_components/Editable";
import { type ExhibitionCategory } from "src/lib/exhibitions";

export type ExhibitionEntry = {
  id: number;
  name: string;
  location: string;
  date: string;
};

export type ExhibitionGroup = {
  category: ExhibitionCategory;
  heading: string;
  entries: ExhibitionEntry[];
};

export default function ExhibitionsBody({
  groups,
  content,
}: {
  groups: ExhibitionGroup[];
  content: Record<string, string>;
}) {
  return (
    <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:max-w-[1080px] md:min-w-0 md:px-[72px] md:pt-16">
      <div className="text-ash font-mono text-[10.5px] tracking-[0.3em] uppercase">
        Exhibitions
      </div>
      <EditableText
        k="exhibitions.heading"
        value={content["exhibitions.heading"] ?? ""}
        as="h1"
        className="mt-[18px] text-[44px] leading-[1.1] font-light tracking-[-0.015em]"
      />

      <div className="mt-[54px] flex max-w-[680px] flex-col gap-14">
        {groups.map((group) => (
          <section key={group.category}>
            <div className="border-line text-clay border-b pb-[18px] font-mono text-[11px] tracking-[0.26em] uppercase">
              {group.heading}
            </div>
            <div className="flex flex-col">
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="border-line-soft grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-6 border-b py-5"
                >
                  <div>
                    <div className="font-spectral text-[22px] leading-[1.2] italic">
                      {entry.name}
                    </div>
                    <div className="text-stone-2 mt-[7px] font-mono text-[11px] tracking-[0.04em]">
                      {entry.location}
                    </div>
                  </div>
                  <div className="text-ash font-mono text-[11px] tracking-[0.1em] whitespace-nowrap uppercase">
                    {entry.date}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
