import { BotGrid } from "@/components/dashboard/BotCard";
import { Header } from "@/components/layout/Header";
import { getAllBots } from "@/lib/bots/registry";

export default function BotsPage() {
  const bots = getAllBots();

  return (
    <>
      <Header
        title="Bot Fleet"
        description="All six Minecadia Discord bots managed from one place."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bots" },
        ]}
      />
      <BotGrid bots={bots} />
    </>
  );
}
