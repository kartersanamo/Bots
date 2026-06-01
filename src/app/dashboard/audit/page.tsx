import { AuditLogClient } from "@/components/audit/AuditLogClient";
import { Header } from "@/components/layout/Header";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function AuditPage() {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");
  if (!can(session.tier, "audit.view")) redirect("/unauthorized");

  return (
    <>
      <Header
        title="Audit Log"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Audit" },
        ]}
      />
      <AuditLogClient />
    </>
  );
}
