import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-zinc-950">{children}</main>
    </div>
  );
}
