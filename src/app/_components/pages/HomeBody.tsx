"use client";

import Link from "next/link";

import ArtImage from "src/app/_components/ArtImage";
import { EditableText } from "src/app/_components/Editable";
import ScrollRail from "src/app/_components/ScrollRail";

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
    <main className="flex min-h-[700px] flex-1 flex-col md:ml-[280px] md:min-w-0">
      <ScrollRail
        header={
          <div className="flex-none px-9 pt-12 md:px-[72px] md:pt-12">
            <EditableText
              k="home.eyebrow"
              value={content["home.eyebrow"] ?? ""}
              as="div"
              className="text-ash font-mono text-[10.5px] tracking-[0.3em] uppercase"
            />
          </div>
        }
      >
        <div className="relative flex min-h-[560px] w-max min-w-full items-start gap-16 px-9 pt-[84px] md:px-[72px]">
          <div className="bg-ink absolute top-[84px] right-0 left-0 h-[2px]" />

          {cards.map((card) => (
            <Link
              key={card.slug}
              href={`/series/${card.slug}`}
              className="swing serieslink flex w-[300px] flex-none flex-col items-center"
            >
              {/* Hanging cord + pin */}
              <div className="relative h-[34px] w-px bg-[#b9b3a6]">
                <span className="bg-ink absolute top-[-4px] left-[-3.5px] h-[8px] w-[8px] rounded-full" />
              </div>

              <div className="swing-img bg-panel w-full overflow-hidden shadow-[0_18px_30px_-22px_rgba(0,0,0,0.45)]">
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
                <div className="openpip text-ash mt-[7px] font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-200">
                  {card.workCount} work{card.workCount === 1 ? "" : "s"} →
                </div>
              </div>
            </Link>
          ))}

          <div className="w-6 flex-none" />
        </div>
      </ScrollRail>
    </main>
  );
}
