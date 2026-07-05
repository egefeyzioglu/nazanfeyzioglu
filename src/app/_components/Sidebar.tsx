import SidebarBody, {
  type NavKey,
} from "src/app/_components/pages/SidebarBody";
import { getContent } from "src/server/queries";

export type { NavKey };

export default async function Sidebar({ active }: { active: NavKey }) {
  const content = await getContent();
  return <SidebarBody active={active} content={content} />;
}
