"use client";

import Link from "next/link";

import {
  EditableParagraphs,
  EditableText,
} from "src/app/_components/Editable";

export default function AboutBody({
  content,
}: {
  content: Record<string, string>;
}) {
  return (
    <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:min-w-0 md:max-w-[1080px] md:px-[72px] md:pt-16">
      <div className="font-mono text-[10.5px] tracking-[0.3em] text-ash uppercase">
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
              className={`${i === 0 ? "mt-[30px]" : "mt-5"} text-[15.5px] leading-[1.85] text-mute text-pretty`}
            >
              {p}
            </p>
          )}
        />

        <div className="mt-[42px] flex flex-wrap gap-x-16 gap-y-8 border-t border-line pt-[26px] font-mono text-[11px] leading-[2] tracking-[0.04em] text-stone">
          <div>
            <div className="mb-2 text-[10px] tracking-[0.2em] text-ash uppercase">
              Medium
            </div>
            <EditableText
              k="about.medium"
              value={content["about.medium"] ?? ""}
            />
          </div>
          <div>
            <div className="mb-2 text-[10px] tracking-[0.2em] text-ash uppercase">
              Based in
            </div>
            <EditableText
              k="about.basedIn"
              value={content["about.basedIn"] ?? ""}
            />
          </div>
          <div>
            <div className="mb-2 text-[10px] tracking-[0.2em] text-ash uppercase">
              Exhibitions
            </div>
            <Link
              href="/exhibitions"
              className="hover-clay border-b border-clay-soft pb-[2px] text-clay"
            >
              View all →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
