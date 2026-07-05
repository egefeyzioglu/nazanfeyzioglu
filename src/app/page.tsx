import Sidebar from "src/app/_components/Sidebar";
import HomeBody from "src/app/_components/pages/HomeBody";
import { getAllSeries, getContent } from "src/server/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [series, content] = await Promise.all([getAllSeries(), getContent()]);

  const cards = series.map((s) => ({
    slug: s.slug,
    title: s.title,
    coverImage: s.coverImage,
    coverWidth: s.coverWidth,
    coverHeight: s.coverHeight,
    workCount: s.works.length,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink md:flex-row">
      <Sidebar active="series" />
      <HomeBody cards={cards} content={content} />
    </div>
  );
}
