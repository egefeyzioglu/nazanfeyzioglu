import Sidebar from "src/app/_components/Sidebar";
import PoliciesBody from "src/app/_components/pages/PoliciesBody";
import { getContent } from "src/server/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shipping & returns — Nazan Feyzioğlu" };

export default async function PoliciesPage() {
  const content = await getContent();

  return (
    <div className="bg-paper text-ink flex min-h-screen flex-col md:flex-row">
      <Sidebar active="policies" />
      <PoliciesBody content={content} />
    </div>
  );
}
