"use client";

import Link from "next/link";

import ArtImage from "src/app/_components/ArtImage";
import { EditableText } from "src/app/_components/Editable";

export type HomeCard = {
  slug: string;
  title: string;
  coverImage: string;
  coverWidth: number;
  coverHeight: number;
  workCount: number;
};

export default function HomeBody({
  cards,
  content,
}: {
  cards: HomeCard[];
  content: Record<string, string>;
}) {
  return (
    <main className="flex min-h-[700px] flex-1 flex-col md:ml-[280px] md:h-screen md:min-w-0">
      <div className="flex-none px-9 pt-12 md:px-[72px] md:pt-12">
        <EditableText
          k="home.eyebrow"
          value={content["home.eyebrow"] ?? ""}
          as="div"
          className="font-mono text-[10.5px] tracking-[0.3em] text-ash uppercase"
        />
      </div>

      <div className="nagon-rail flex-1 overflow-x-auto md:min-h-0 md:overflow-y-hidden">
        <div className="relative flex min-h-[560px] w-max min-w-full items-start gap-16 px-9 pt-[84px] md:px-[72px]">
          <div className="absolute top-[84px] right-0 left-0 h-[2px] bg-ink" />

          {cards.map((card) => (
            <Link
              key={card.slug}
              href={`/series/${card.slug}`}
              className="swing serieslink flex w-[300px] flex-none flex-col items-center"
            >
              {/* Hanging cord + pin */}
              <div className="relative h-[34px] w-px bg-[#b9b3a6]">
                <span className="absolute top-[-4px] left-[-3.5px] h-[8px] w-[8px] rounded-full bg-ink" />
              </div>

              <div className="swing-img w-full overflow-hidden bg-panel shadow-[0_18px_30px_-22px_rgba(0,0,0,0.45)]">
                <ArtImage
                  src={card.coverImage}
                  alt={card.title}
                  sizes="300px"
                  width={card.coverWidth}
                  height={card.coverHeight}
                />
              </div>

              <div className="mt-[18px] text-center">
                <div className="font-spectral text-[20px] leading-[1.2] italic">
                  {card.title}
                </div>
                <div className="openpip mt-[7px] font-mono text-[10px] tracking-[0.14em] text-ash uppercase transition-colors duration-200">
                  {card.workCount} work{card.workCount === 1 ? "" : "s"} →
                </div>
              </div>
            </Link>
          ))}

          <div className="w-6 flex-none" />
        </div>
      </div>
    </main>
  );
}
