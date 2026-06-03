import {
  PublicFooter,
  PublicHeader,
  PublicLandingMain,
  PublicShell,
} from "@/components/landing/LandingSections";
import { hasDashboardAccess } from "@/lib/auth/dashboard-access";
import { getSession } from "@/lib/auth/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "kartersanamo.com",
  description: "",
  robots: { index: false, follow: false },
};

export default async function HomePage() {
  const session = await getSession();
  if (session && hasDashboardAccess(session)) {
    redirect("/dashboard");
  }

  return (
    <PublicShell>
      <PublicHeader activePath="/" />
      <PublicLandingMain />
      <PublicFooter />
    </PublicShell>
  );
}
