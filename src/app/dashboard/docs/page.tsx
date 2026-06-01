import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/layout/Header";
import {
  BookOpen,
  Layers,
  Rocket,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";

const PHASES = [
  {
    phase: "Phase 1 — Foundation",
    status: "done" as const,
    items: [
      "Discord OAuth with role-based access",
      "Owner override for full access",
      "Landing page with dark purple branding",
      "Dashboard shell with sidebar navigation",
      "Bot fleet registry (all 6 bots)",
      "Read-only MySQL stats (tickets, leveling, polls)",
      "Discord API server overview (members, channels, roles)",
      "Architecture & feature roadmap docs",
    ],
  },
  {
    phase: "Phase 2 — Bot Control API",
    status: "current" as const,
    items: [
      "Python/FastAPI service for bot management",
      "Live bot status & uptime monitoring",
      "Log tail viewer per bot",
      "JSON config editor with backups",
      "Start/stop/restart bot processes",
      "DM inbox per bot",
      "Audit log for all writes",
    ],
  },
  {
    phase: "Phase 3 — Full Management",
    status: "planned" as const,
    items: [
      "Ticket management UI",
      "Moderation tools (ban, timeout, media ranks)",
      "Games admin (XP, configs, leaderboards)",
      "Staff leaderboard & strike workflows",
      "Polls, tags, screenshare management",
      "Analytics dashboards & exports",
    ],
  },
];

const DOC_LINKS = [
  {
    title: "Architecture",
    description: "How auth, data flow, and deployment work.",
    href: "/dashboard/docs/architecture",
    icon: Layers,
  },
  {
    title: "Feature Roadmap",
    description: "Complete list of planned features by area.",
    href: "/dashboard/docs/features",
    icon: Rocket,
  },
  {
    title: "Deployment",
    description: "Setup guide for bots.kartersanamo.com.",
    href: "/dashboard/docs/deployment",
    icon: Zap,
  },
  {
    title: "Control API",
    description: "Process, config, logs, and DM proxy service.",
    href: "/dashboard/docs/control-api",
    icon: Shield,
  },
];

export default function DocsPage() {
  return (
    <>
      <Header
        title="Documentation"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Docs" },
        ]}
      />

      <div className="mb-10 grid gap-4 md:grid-cols-3">
        {DOC_LINKS.map((doc) => (
          <Link key={doc.href} href={doc.href}>
            <Card hover className="h-full">
              <doc.icon className="mb-3 h-6 w-6 text-accent-light" />
              <h3 className="font-semibold text-white">{doc.title}</h3>
              <p className="mt-1 text-sm text-muted">{doc.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-6 text-xl font-bold text-white">Implementation Phases</h2>
      <div className="space-y-6">
        {PHASES.map((phase) => (
          <Card key={phase.phase}>
            <div className="mb-4 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-accent-light" />
              <h3 className="text-lg font-semibold text-white">{phase.phase}</h3>
              <Badge
                variant={
                  phase.status === "current"
                    ? "success"
                    : phase.status === "done"
                      ? "info"
                      : "default"
                }
              >
                {phase.status === "current"
                  ? "Current"
                  : phase.status === "done"
                    ? "Complete"
                    : "Planned"}
              </Badge>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {phase.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted"
                >
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/60" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
