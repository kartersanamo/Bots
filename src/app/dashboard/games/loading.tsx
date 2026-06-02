import {
  PageHeaderSkeleton,
  StatGridSkeleton,
  TabBarSkeleton,
  TableSkeleton,
} from "@/components/ui/route-loading";

export default function GamesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TabBarSkeleton tabs={10} />
      <StatGridSkeleton count={4} />
      <TableSkeleton rows={6} />
    </div>
  );
}
