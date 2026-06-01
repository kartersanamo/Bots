import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";

export default function DeploymentDocPage() {
  return (
    <>
      <Header
        title="Deployment"
        description="Production deployment checklist for bots.kartersanamo.com."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Docs", href: "/dashboard/docs" },
          { label: "Deployment" },
        ]}
      />

      <div className="space-y-6">
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Checklist</h2>
          <ol className="space-y-2 text-sm text-muted">
            <li>1. Point DNS `bots.kartersanamo.com` to the server.</li>
            <li>2. Build and run Next.js on port 3000.</li>
            <li>3. Configure nginx reverse proxy.</li>
            <li>4. Enable SSL with certbot.</li>
            <li>5. Set environment variables securely.</li>
            <li>6. Run app with PM2 or systemd.</li>
          </ol>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Important Note</h2>
          <p className="text-sm text-muted">
            Deployment server configuration is documented in `docs/DEPLOYMENT.md`.
            It is intentionally not automated from this repository.
          </p>
        </Card>
      </div>
    </>
  );
}
