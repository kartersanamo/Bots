import { cn } from "@/lib/utils";

export function Pulse({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-surface-hover", className)} />
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 space-y-2">
      <Pulse className="h-4 w-32" />
      <Pulse className="h-8 w-48" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <Pulse className="h-3 w-24" />
          <Pulse className="mt-3 h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <Pulse className="h-4 w-28" />
        <Pulse className="h-3 w-16" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Pulse key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Pulse className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Pulse key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return <Pulse className="h-64 w-full rounded-lg border border-border" />;
}

export function TabBarSkeleton({ tabs = 6 }: { tabs?: number }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      {Array.from({ length: tabs }).map((_, i) => (
        <Pulse key={i} className="h-8 w-24 rounded-md" />
      ))}
    </div>
  );
}

export function BotGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Pulse key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <StatGridSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CardListSkeleton rows={3} />
        <CardListSkeleton rows={4} />
      </div>
      <StatGridSkeleton count={2} />
    </div>
  );
}
