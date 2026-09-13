"use client";

import { EditableParagraphs, EditableText } from "src/app/_components/Editable";
import { CONTENT_DEFAULTS } from "src/lib/content-keys";

export default function ShippingBody({
  content,
}: {
  content: Record<string, string>;
}) {
  const value = (key: string) =>
    content[`shipping.${key}`] ?? CONTENT_DEFAULTS[`shipping.${key}`] ?? "";
  const text = (
    key: string,
    as: React.ElementType = "p",
    className?: string,
  ) => (
    <EditableText
      k={`shipping.${key}`}
      value={value(key)}
      as={as}
      className={className}
    />
  );
  const body = (key: string) => (
    <EditableParagraphs
      k={`shipping.${key}`}
      value={value(key)}
      renderParagraph={(paragraph, index) => (
        <p key={index} className="mt-5">
          {paragraph}
        </p>
      )}
    />
  );
  const headingClass = "text-ink mb-5 text-[28px] leading-tight font-light";
  const sectionClass = "border-line mt-10 border-t pt-8";

  return (
    <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:max-w-[1080px] md:min-w-0 md:px-[72px] md:pt-16">
      {text(
        "heading",
        "h1",
        "text-[36px] leading-[1.15] font-light tracking-[-0.015em] md:text-[44px]",
      )}
      <div className="text-mute mt-11 max-w-[620px] text-[15.5px] leading-[1.85] text-pretty">
        <section>
          {text("shipping.heading", "h2", headingClass)}
          {text("shipping.intro")}
          {text("originals.heading", "h3", "text-ink mt-6 font-semibold")}
          {body("originals.body")}
          {text("prints.heading", "h3", "text-ink mt-6 font-semibold")}
          {body("prints.body")}
        </section>
        <section className={sectionClass}>
          {text("returns.heading", "h2", headingClass)}
          {body("returns.body")}
        </section>
        <section className={sectionClass}>
          {text("damage.heading", "h2", headingClass)}
          <p>
            {text("damage.intro", "span")}{" "}
            {text("damage.deadline", "strong", "text-ink font-semibold")}.
          </p>
          {text("damage.instructions", "p", "mt-5")}
          <ul className="mt-3 list-disc space-y-1 pl-6">
            {["artwork", "damage", "packaging", "label"].map((item) => (
              <li key={item}>{text(`damage.${item}`, "span")}</li>
            ))}
          </ul>
          {body("damage.body")}
        </section>
        <section className={sectionClass}>
          {text("important.heading", "h2", headingClass)}
          {body("important.body")}
        </section>
      </div>
    </main>
  );
}
