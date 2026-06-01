import { Header } from "@/components/layout/Header";
import { ServerOverview } from "@/components/dashboard/ServerOverview";

export default function ServerPage() {
  return (
    <>
      <Header
        title="Server"
        description="Minecadia Discord server overview — members, channels, and roles."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Server" },
        ]}
      />
      <ServerOverview />
    </>
  );
}
