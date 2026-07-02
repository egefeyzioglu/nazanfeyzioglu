import Sidebar from "src/app/_components/Sidebar";
import { getContent } from "src/server/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Contact — Nazan Feyzioğlu" };

export default async function ContactPage() {
  const content = await getContent();
  const email = content["contact.email"];
  const instagram = content["sidebar.instagram"];

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink md:flex-row">
      <Sidebar active="contact" />

      <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:min-w-0 md:max-w-[1080px] md:px-[72px] md:pt-16">
        <div className="font-mono text-[10.5px] tracking-[0.3em] text-ash uppercase">
          Contact
        </div>
        <h1 className="mt-[18px] max-w-[620px] text-[44px] leading-[1.1] font-light tracking-[-0.015em] text-balance">
          {content["contact.heading"]}
        </h1>

        <a
          href={`mailto:${email}`}
          className="hover-clay mt-10 inline-block border-b border-line-2 pb-[5px] font-spectral text-[40px] font-light tracking-[-0.01em]"
        >
          {email}
        </a>

        <div className="mt-16 grid max-w-[760px] grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <div className="mb-3 font-mono text-[10px] tracking-[0.22em] text-ash uppercase">
              Based in
            </div>
            <div className="text-[16px] leading-[1.6] text-ink-soft">
              {content["contact.basedIn"]}
            </div>
          </div>
          <div>
            <div className="mb-3 font-mono text-[10px] tracking-[0.22em] text-ash uppercase">
              Social
            </div>
            <div className="text-[16px] leading-[1.7] text-ink-soft">
              <a
                href={`https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover-clay border-b border-line"
              >
                Instagram
              </a>
              <br />
              <span className="font-mono text-[12px] text-stone-2">
                @{instagram}
              </span>
            </div>
          </div>
          <div>
            <div className="mb-3 font-mono text-[10px] tracking-[0.22em] text-ash uppercase">
              Enquiries
            </div>
            <div className="text-[16px] leading-[1.6] text-ink-soft">
              Commissions &amp; enquiries
              <br />
              <span className="text-[14px] text-stone-2">
                Replies within a few days
              </span>
            </div>
          </div>
        </div>

        <p className="mt-[66px] max-w-[560px] text-[19px] leading-[1.6] font-light text-mute text-pretty">
          {content["contact.outro"]}
        </p>
      </main>
    </div>
  );
}
