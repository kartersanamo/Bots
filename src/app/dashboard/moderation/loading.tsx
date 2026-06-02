import {
  PageHeaderSkeleton,
  TabBarSkeleton,
  TableSkeleton,
} from "@/components/ui/route-loading";

export default function ModerationLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TabBarSkeleton tabs={3} />
      <TableSkeleton rows={8} />
    </div>
  );
}
