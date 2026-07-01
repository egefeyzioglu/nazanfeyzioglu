import Link from "next/link";

import Sidebar from "src/app/_components/Sidebar";

export const metadata = { title: "About — Nazan Feyzioğlu" };

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink md:flex-row">
      <Sidebar active="about" />

      <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:min-w-0 md:max-w-[1080px] md:px-[72px] md:pt-16">
        <div className="font-mono text-[10.5px] tracking-[0.3em] text-ash uppercase">
          About
        </div>
        <h1 className="mt-[18px] text-[44px] leading-[1.1] font-light tracking-[-0.015em]">
          Nazan Feyzioğlu
        </h1>

        <div className="mt-11 max-w-[620px]">
          <p className="m-0 text-[22px] leading-[1.55] font-light text-pretty">
            Nazan Feyzioglu is a self-taught visual artist based in Toronto whose
            work explores the space between abstraction and figuration.
          </p>

          <p className="mt-[30px] text-[15.5px] leading-[1.85] text-mute text-pretty">
            Her paintings begin with abstract forms that gradually come together
            to create figures, gestures, and relationships. While recognizable
            characters emerge, the narratives remain open-ended. Rather than
            telling a specific story, each work invites viewers to bring their own
            memories, emotions, and interpretations into the image.
          </p>

          <p className="mt-5 text-[15.5px] leading-[1.85] text-mute text-pretty">
            Feyzioglu&apos;s artistic journey began in 2015 through Mandala
            drawing and later evolved into Zentangle-based explorations of
            pattern, rhythm, and repetition. Over time, these elements became the
            foundation of her figurative language. Today, she works primarily with
            acrylic on panel, building compositions from simplified forms, layered
            color relationships, and carefully balanced visual structures.
          </p>

          <p className="mt-5 text-[15.5px] leading-[1.85] text-mute text-pretty">
            Themes of connection, shared presence, curiosity, and the subtle humor
            of everyday life run throughout her work. Her figures often function as
            visual metaphors rather than portraits, creating spaces where personal
            and collective experiences can coexist.
          </p>

          <p className="mt-5 text-[15.5px] leading-[1.85] text-mute text-pretty">
            Although her paintings appear playful at first glance, they frequently
            explore deeper emotional territories—memory, belonging, inner dialogue,
            and the ways people relate to one another. Feyzioglu is particularly
            interested in the point where abstraction becomes representation, and
            where representation dissolves back into feeling and imagination.
          </p>

          <p className="mt-5 text-[15.5px] leading-[1.85] text-mute text-pretty">
            Her work has been exhibited internationally, including ArtAnkara
            International Contemporary Art Fair, Brussels Art Fair, and exhibitions
            in Madrid. She continues to develop her practice through exhibitions and
            art fairs, creating paintings that balance structure and spontaneity,
            humor and reflection, abstraction and narrative possibility.
          </p>

          <div className="mt-[42px] flex flex-wrap gap-x-16 gap-y-8 border-t border-line pt-[26px] font-mono text-[11px] leading-[2] tracking-[0.04em] text-stone">
            <div>
              <div className="mb-2 text-[10px] tracking-[0.2em] text-ash uppercase">
                Medium
              </div>
              Acrylic on panel
            </div>
            <div>
              <div className="mb-2 text-[10px] tracking-[0.2em] text-ash uppercase">
                Based in
              </div>
              Toronto, Canada
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
    </div>
  );
}
