import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function ControlApiDocsPage() {
  return (
    <>
      <Header
        title="Control API"
        description="Local FastAPI service for bot process, config, log, and DM management."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Docs", href: "/dashboard/docs" },
          { label: "Control API" },
        ]}
      />
      <Card className="prose prose-invert max-w-none space-y-4 text-sm text-muted">
        <p>
          Run <code className="text-accent-light">npm run control-api</code> on
          the server (port 8787, localhost only). Set{" "}
          <code className="text-accent-light">CONTROL_API_SECRET</code> in{" "}
          <code>.env</code>.
        </p>
        <p>
          See the full guide in the repo:{" "}
          <code>docs/CONTROL_API.md</code>
        </p>
        <Link
          href="/dashboard/bots"
          className="inline-block text-accent-light hover:underline"
        >
          Open Bots hub →
        </Link>
      </Card>
    </>
  );
}
