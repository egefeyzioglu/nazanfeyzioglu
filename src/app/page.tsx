import FeaturedGallery from "src/app/_components/FeaturedGallery";
import HomeSidebar from "src/app/_components/HomeSidebar";
import { heroPieces } from "src/app/_data/heroPieces";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50 font-hanken text-neutral-900">
      <HomeSidebar />
      <main className="pt-16 md:pt-0 md:pl-56 lg:pl-64">
        <FeaturedGallery pieces={heroPieces} />
      </main>
    </div>
  );
}
