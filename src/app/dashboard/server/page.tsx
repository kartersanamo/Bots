import { ServerOverview } from "@/components/dashboard/ServerOverview";
import { Header } from "@/components/layout/Header";
import { getGuildInfoPayload } from "@/lib/data/guild-info";

export default async function ServerPage() {
  const initialData = await getGuildInfoPayload();

  return (
    <>
      <Header
        title="Server"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Server" },
        ]}
      />
      <ServerOverview initialData={initialData} />
    </>
  );
}
