import Sidebar from "src/app/_components/Sidebar";
import CartBody from "src/app/_components/pages/CartBody";
import { stripeConfigured } from "src/server/stripe";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cart — Nazan Feyzioğlu" };

/** The cart itself lives in the browser; this page only supplies the chrome. */
export default function CartPage() {
  return (
    <div className="bg-paper text-ink flex min-h-screen flex-col md:flex-row">
      <Sidebar active="cart" />
      <CartBody checkoutEnabled={stripeConfigured()} />
    </div>
  );
}
