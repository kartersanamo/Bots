import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { Header } from "@/components/layout/Header";
import { getDashboardHomePayload } from "@/lib/data/dashboard-home";

export default async function DashboardPage() {
  const initialData = await getDashboardHomePayload();

  return (
    <>
      <Header title="Overview" />
      <DashboardOverview initialData={initialData} />
    </>
  );
}
