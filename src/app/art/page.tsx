import GalleryGrid from "src/app/_components/GalleryGrid";
import Navbar from "src/app/_components/Navbar";
import { galleryPieces } from "src/app/_data/galleryPieces";

export default function ArtPage() {
  return (
    <div className="min-h-screen bg-warm-bg font-hanken text-warm-text">
      <Navbar />
      <main className="mx-auto max-w-[1600px] px-[clamp(22px,4.4vw,64px)] pb-[clamp(80px,12vh,140px)] pt-[clamp(120px,18vh,180px)]">
        <header className="mb-12">
          <h1 className="font-display text-[clamp(26px,3vw,40px)] font-light tracking-tight">
            Selected Works
          </h1>
        </header>
        <GalleryGrid pieces={galleryPieces} />
      </main>
    </div>
  );
}
