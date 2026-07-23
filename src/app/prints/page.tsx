import Sidebar from "src/app/_components/Sidebar";
import PrintsBody from "src/app/_components/pages/PrintsBody";
import { getContent, getPrintGroups } from "src/server/queries";
import { stripeConfigured } from "src/server/stripe";

export const dynamic = "force-dynamic";

export const metadata = { title: "Prints — Nazan Feyzioğlu" };

export default async function PrintsPage() {
  const [groups, content] = await Promise.all([getPrintGroups(), getContent()]);

  return (
    <div className="bg-paper text-ink flex min-h-screen flex-col md:flex-row">
      <Sidebar active="prints" />
      <PrintsBody
        groups={groups.map((g) => ({
          id: g.id,
          title: g.title,
          prints: g.prints,
        }))}
        content={content}
        checkoutEnabled={stripeConfigured()}
      />
    </div>
  );
}
