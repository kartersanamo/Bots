import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/route-loading";

export default function TicketlogsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} />
    </div>
  );
}
