import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";

const sections = [
  {
    title: "Authentication and Access",
    items: [
      "Discord OAuth login",
      "Owner override",
      "Tier-based authorization",
      "Per-page permission checks",
    ],
  },
  {
    title: "Global Dashboard",
    items: [
      "Fleet status overview",
      "Ticket and server metrics",
      "Notification center",
      "Global search",
    ],
  },
  {
    title: "Bot Modules",
    items: [
      "Tickets management suite",
      "Moderation controls",
      "Games controls and statistics",
      "Utilities workflows",
      "Staff and leader management",
    ],
  },
  {
    title: "Operations and Analytics",
    items: [
      "Process health monitoring",
      "Log viewer",
      "Scheduled reports",
      "Cross-bot analytics",
    ],
  },
];

export default function FeaturesDocPage() {
  return (
    <>
      <Header
        title="Feature Roadmap"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Docs", href: "/dashboard/docs" },
          { label: "Features" },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <h2 className="mb-3 text-lg font-semibold text-white">{section.title}</h2>
            <ul className="space-y-2 text-sm text-muted">
              {section.items.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
