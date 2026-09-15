"use client";

import { EditableParagraphs, EditableText } from "src/app/_components/Editable";

const BODY_CLS = "text-mute text-[15.5px] leading-[1.85] text-pretty";
const SECTION_HEADING_CLS = "text-[24px] leading-[1.2] font-light";
const SUBHEADING_CLS =
  "text-ash font-mono text-[10px] tracking-[0.22em] uppercase";

function renderParagraph(p: React.ReactNode, i: number) {
  return (
    <p key={i} className={`${i === 0 ? "mt-0" : "mt-4"} ${BODY_CLS}`}>
      {p}
    </p>
  );
}

/** Shop policies: shipping, final-sale returns, and damaged or incorrect orders. */
export default function PoliciesBody({
  content,
}: {
  content: Record<string, string>;
}) {
  const text = (key: string) => content[key] ?? "";
  const body = (key: string, className = "mt-5") => (
    <div className={className}>
      <EditableParagraphs
        k={key}
        value={text(key)}
        renderParagraph={renderParagraph}
      />
    </div>
  );

  return (
    <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:max-w-[1080px] md:min-w-0 md:px-[72px] md:pt-16">
      <div className="text-ash font-mono text-[10.5px] tracking-[0.3em] uppercase">
        Policies
      </div>
      <EditableText
        k="policies.heading"
        value={text("policies.heading")}
        as="h1"
        className="mt-[18px] text-[44px] leading-[1.1] font-light tracking-[-0.015em]"
      />

      <div className="mt-11 flex max-w-[620px] flex-col gap-12">
        <section>
          <EditableText
            k="policies.shipping.heading"
            value={text("policies.shipping.heading")}
            as="h2"
            className={SECTION_HEADING_CLS}
          />
          {body("policies.shipping.intro")}
          <EditableText
            k="policies.shipping.originalsLabel"
            value={text("policies.shipping.originalsLabel")}
            as="h3"
            className={`mt-7 ${SUBHEADING_CLS}`}
          />
          {body("policies.shipping.originals", "mt-3")}
          <EditableText
            k="policies.shipping.printsLabel"
            value={text("policies.shipping.printsLabel")}
            as="h3"
            className={`mt-7 ${SUBHEADING_CLS}`}
          />
          {body("policies.shipping.prints", "mt-3")}
          {body("policies.shipping.notes", "mt-7")}
        </section>

        <section>
          <EditableText
            k="policies.returns.heading"
            value={text("policies.returns.heading")}
            as="h2"
            className={SECTION_HEADING_CLS}
          />
          {body("policies.returns.body")}
        </section>

        <section>
          <EditableText
            k="policies.damaged.heading"
            value={text("policies.damaged.heading")}
            as="h2"
            className={SECTION_HEADING_CLS}
          />
          {body("policies.damaged.intro")}
          <EditableParagraphs
            k="policies.damaged.checklist"
            value={text("policies.damaged.checklist")}
            as="ul"
            className="mt-4 list-disc pl-6"
            renderParagraph={(p, i) => (
              <li key={i} className={`${i === 0 ? "" : "mt-1"} ${BODY_CLS}`}>
                {p}
              </li>
            )}
          />
          {body("policies.damaged.outro", "mt-4")}
        </section>

        <section className="border-line border-t pt-8">
          <EditableText
            k="policies.important.heading"
            value={text("policies.important.heading")}
            as="h2"
            className={SECTION_HEADING_CLS}
          />
          {body("policies.important.body")}
        </section>
      </div>
    </main>
  );
}
