import Sidebar from "src/app/_components/Sidebar";
import ContactBody from "src/app/_components/pages/ContactBody";
import { getContent } from "src/server/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Contact — Nazan Feyzioğlu" };

export default async function ContactPage() {
  const content = await getContent();

  return (
    <div className="bg-paper text-ink flex min-h-screen flex-col md:flex-row">
      <Sidebar active="contact" />
      <ContactBody content={content} />
    </div>
  );
}
