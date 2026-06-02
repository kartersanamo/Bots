import { BotGridSkeleton, PageHeaderSkeleton } from "@/components/ui/route-loading";

export default function BotsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <BotGridSkeleton />
    </div>
  );
}
