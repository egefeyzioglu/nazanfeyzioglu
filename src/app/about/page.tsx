import Sidebar from "src/app/_components/Sidebar";
import AboutBody from "src/app/_components/pages/AboutBody";
import { getContent } from "src/server/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "About — Nazan Feyzioğlu" };

export default async function AboutPage() {
  const content = await getContent();

  return (
    <div className="bg-paper text-ink flex min-h-screen flex-col md:flex-row">
      <Sidebar active="about" />
      <AboutBody content={content} />
    </div>
  );
}
