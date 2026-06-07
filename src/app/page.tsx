import HeroSection from "src/app/_components/HeroSection";
import Navbar from "src/app/_components/Navbar";
import { heroPieces } from "src/app/_data/heroPieces";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="snap-container h-screen overflow-y-scroll bg-neutral-950">
        {heroPieces.map((piece, i) => (
          <HeroSection
            key={piece.src}
            piece={piece}
            priority={i === 0}
            showScrollHint={i === 0}
          />
        ))}
      </main>
    </>
  );
}
