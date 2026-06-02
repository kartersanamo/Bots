import { Pulse } from "@/components/ui/route-loading";

export function PanelFallback() {
  return (
    <div className="space-y-4">
      <Pulse className="h-8 w-48" />
      <Pulse className="h-64 w-full rounded-lg" />
    </div>
  );
}
