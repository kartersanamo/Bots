import { Header } from "@/components/layout/Header";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default function DashboardPage() {
  return (
    <>
      <Header title="Overview" />
      <DashboardOverview />
    </>
  );
}
