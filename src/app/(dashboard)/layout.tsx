import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AiPanel } from "@/components/layout/ai-panel";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header user={session} />
        <div className="flex min-h-0 flex-1">
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
          <AiPanel />
        </div>
      </div>
    </div>
  );
}
