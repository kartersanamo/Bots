import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";

export default function ArchitectureDocPage() {
  return (
    <>
      <Header
        title="Architecture"
        description="How authentication, authorization, and data flow work in Bots."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Docs", href: "/dashboard/docs" },
          { label: "Architecture" },
        ]}
      />

      <div className="space-y-6">
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Phase 1 Scope</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>- Read-only dashboard with Discord OAuth login.</li>
            <li>- Owner override for full administrative access.</li>
            <li>- Role-mapped permission tiers based on Minecadia hierarchy.</li>
            <li>- Data from MySQL and Discord REST APIs.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Request Lifecycle</h2>
          <ol className="space-y-2 text-sm text-muted">
            <li>1. User authenticates through Discord OAuth.</li>
            <li>2. App stores an HTTP-only session cookie.</li>
            <li>3. Middleware protects all `/dashboard/*` routes.</li>
            <li>4. Server API routes fetch data from MySQL and Discord API.</li>
            <li>5. UI renders role-appropriate content.</li>
          </ol>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Phase 2 Direction</h2>
          <p className="text-sm text-muted">
            A dedicated Bot Control API service will be introduced for runtime bot
            operations, process controls, and live logs. This keeps bot process
            management separate from the web frontend and improves reliability.
          </p>
        </Card>
      </div>
    </>
  );
}
