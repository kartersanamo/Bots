import {
  PageHeaderSkeleton,
  TabBarSkeleton,
  ChartSkeleton,
} from "@/components/ui/route-loading";

export default function BotDetailLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TabBarSkeleton tabs={5} />
      <ChartSkeleton />
    </div>
  );
}
