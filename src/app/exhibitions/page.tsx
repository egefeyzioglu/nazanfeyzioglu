import Sidebar from "src/app/_components/Sidebar";
import ExhibitionsBody from "src/app/_components/pages/ExhibitionsBody";
import { getContent, getExhibitionGroups } from "src/server/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Exhibitions — Nazan Feyzioğlu" };

export default async function ExhibitionsPage() {
  const [groups, content] = await Promise.all([
    getExhibitionGroups(),
    getContent(),
  ]);

  return (
    <div className="bg-paper text-ink flex min-h-screen flex-col md:flex-row">
      <Sidebar active="exhibitions" />
      <ExhibitionsBody groups={groups} content={content} />
    </div>
  );
}
