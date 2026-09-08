import Sidebar from "src/app/_components/Sidebar";
import ShippingBody from "src/app/_components/pages/ShippingBody";
import { getContent } from "src/server/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shipping, Returns & Exchanges — Nazan Feyzioğlu",
};

export default async function ShippingPage() {
  const content = await getContent();

  return (
    <div className="bg-paper text-ink flex min-h-screen flex-col md:flex-row">
      <Sidebar active="shipping" />
      <ShippingBody content={content} />
    </div>
  );
}
