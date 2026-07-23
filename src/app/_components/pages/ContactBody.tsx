"use client";

import { EditableText } from "src/app/_components/Editable";

export default function ContactBody({
  content,
}: {
  content: Record<string, string>;
}) {
  const email = content["contact.email"] ?? "";
  const instagram = content["sidebar.instagram"] ?? "";

  return (
    <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:max-w-[1080px] md:min-w-0 md:px-[72px] md:pt-16">
      <div className="text-ash font-mono text-[10.5px] tracking-[0.3em] uppercase">
        Contact
      </div>
      <EditableText
        k="contact.heading"
        value={content["contact.heading"] ?? ""}
        as="h1"
        className="mt-[18px] max-w-[620px] text-[44px] leading-[1.1] font-light tracking-[-0.015em] text-balance"
      />

      <a
        href={`mailto:${email}`}
        className="hover-clay border-line-2 font-spectral mt-10 inline-block border-b pb-[5px] text-[40px] font-light tracking-[-0.01em]"
      >
        <EditableText k="contact.email" value={email} />
      </a>

      <div className="mt-16 grid max-w-[760px] grid-cols-1 gap-10 sm:grid-cols-3">
        <div>
          <div className="text-ash mb-3 font-mono text-[10px] tracking-[0.22em] uppercase">
            Based in
          </div>
          <EditableText
            k="contact.basedIn"
            value={content["contact.basedIn"] ?? ""}
            as="div"
            className="text-ink-soft text-[16px] leading-[1.6]"
          />
        </div>
        <div>
          <div className="text-ash mb-3 font-mono text-[10px] tracking-[0.22em] uppercase">
            Social
          </div>
          <div className="text-ink-soft text-[16px] leading-[1.7]">
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover-clay border-line border-b"
            >
              Instagram
            </a>
            <br />
            <span className="text-stone-2 font-mono text-[12px]">
              @<EditableText k="sidebar.instagram" value={instagram} />
            </span>
          </div>
        </div>
        <div>
          <div className="text-ash mb-3 font-mono text-[10px] tracking-[0.22em] uppercase">
            Enquiries
          </div>
          <div className="text-ink-soft text-[16px] leading-[1.6]">
            Commissions &amp; enquiries
            <br />
            <span className="text-stone-2 text-[14px]">
              Replies within a few days
            </span>
          </div>
        </div>
      </div>

      <EditableText
        k="contact.outro"
        value={content["contact.outro"] ?? ""}
        as="p"
        className="text-mute mt-[66px] max-w-[560px] text-[19px] leading-[1.6] font-light text-pretty"
      />
    </main>
  );
}
