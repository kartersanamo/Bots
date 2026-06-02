import {
  ChartSkeleton,
  PageHeaderSkeleton,
  TabBarSkeleton,
} from "@/components/ui/route-loading";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TabBarSkeleton tabs={8} />
      <ChartSkeleton />
    </div>
  );
}
