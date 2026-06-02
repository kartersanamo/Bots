import { PageHeaderSkeleton, StatGridSkeleton } from "@/components/ui/route-loading";

export default function ServerLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatGridSkeleton count={3} />
      <div className="grid gap-4 lg:grid-cols-2">
        <StatGridSkeleton count={1} />
        <StatGridSkeleton count={1} />
      </div>
    </div>
  );
}
