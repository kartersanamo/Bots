import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/route-loading";

export default function AuditLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={12} />
    </div>
  );
}
