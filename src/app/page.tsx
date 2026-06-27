import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get("jip_session");

  if (session?.value) {
    redirect("/dashboard");
  }

  redirect("/login");
}
