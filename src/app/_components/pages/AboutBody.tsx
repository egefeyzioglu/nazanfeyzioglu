"use client";

import Link from "next/link";

import { EditableParagraphs, EditableText } from "src/app/_components/Editable";

export default function AboutBody({
  content,
}: {
  content: Record<string, string>;
}) {
  return (
    <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:max-w-[1080px] md:min-w-0 md:px-[72px] md:pt-16">
      <div className="text-ash font-mono text-[10.5px] tracking-[0.3em] uppercase">
        About
      </div>
      <EditableText
        k="about.heading"
        value={content["about.heading"] ?? ""}
        as="h1"
        className="mt-[18px] text-[44px] leading-[1.1] font-light tracking-[-0.015em]"
      />

      <div className="mt-11 max-w-[620px]">
        <EditableText
          k="about.lead"
          value={content["about.lead"] ?? ""}
          as="p"
          className="m-0 text-[22px] leading-[1.55] font-light text-pretty"
        />

        <EditableParagraphs
          k="about.body"
          value={content["about.body"] ?? ""}
          renderParagraph={(p, i) => (
            <p
              key={i}
              className={`${i === 0 ? "mt-[30px]" : "mt-5"} text-mute text-[15.5px] leading-[1.85] text-pretty`}
            >
              {p}
            </p>
          )}
        />

        <div className="border-line text-stone mt-[42px] flex flex-wrap gap-x-16 gap-y-8 border-t pt-[26px] font-mono text-[11px] leading-[2] tracking-[0.04em]">
          <div>
            <div className="text-ash mb-2 text-[10px] tracking-[0.2em] uppercase">
              Medium
            </div>
            <EditableText
              k="about.medium"
              value={content["about.medium"] ?? ""}
            />
          </div>
          <div>
            <div className="text-ash mb-2 text-[10px] tracking-[0.2em] uppercase">
              Based in
            </div>
            <EditableText
              k="about.basedIn"
              value={content["about.basedIn"] ?? ""}
            />
          </div>
          <div>
            <div className="text-ash mb-2 text-[10px] tracking-[0.2em] uppercase">
              Exhibitions
            </div>
            <Link
              href="/exhibitions"
              className="hover-clay border-clay-soft text-clay border-b pb-[2px]"
            >
              View all →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
