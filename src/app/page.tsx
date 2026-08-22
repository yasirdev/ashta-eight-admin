import { redirect } from "next/navigation";

// Proxy guards /dashboard and bounces unauthenticated users to /login.
export default function Home() {
  redirect("/dashboard");
}
