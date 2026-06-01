import { Header } from "@/components/layout/Header";
import { ServerOverview } from "@/components/dashboard/ServerOverview";

export default function ServerPage() {
  return (
    <>
      <Header
        title="Server"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Server" },
        ]}
      />
      <ServerOverview />
    </>
  );
}
