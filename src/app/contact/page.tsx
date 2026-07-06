import Sidebar from "src/app/_components/Sidebar";
import ContactBody from "src/app/_components/pages/ContactBody";
import { getContent } from "src/server/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Contact — Nazan Feyzioğlu" };

export default async function ContactPage() {
  const content = await getContent();

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink md:flex-row">
      <Sidebar active="contact" />
      <ContactBody content={content} />
    </div>
  );
}
