"use client";

import { ViewerHighlightSpan } from "@/components/discord/ViewerHighlightProvider";
import type { SessionUser } from "@/lib/auth/session";
import { tierColor, tierLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  BarChart3,
  Bot,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  Server,
  Shield,
  ScrollText,
  Ticket,
  X,
} from "lucide-react";
import { can } from "@/lib/permissions";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart3,
    permission: "analytics.read" as const,
  },
  {
    href: "/dashboard/tickets",
    label: "Tickets",
    icon: Ticket,
    permission: "tickets.read" as const,
  },
  {
    href: "/dashboard/ticketlogs",
    label: "Ticketlogs",
    icon: Archive,
    permission: "tickets.read" as const,
  },
  {
    href: "/dashboard/games",
    label: "Games",
    icon: Gamepad2,
    permission: "games.read" as const,
  },
  { href: "/dashboard/bots", label: "Bots", icon: Bot },
  { href: "/dashboard/server", label: "Server", icon: Server },
  { href: "/dashboard/moderation", label: "Moderation", icon: Shield },
  { href: "/dashboard/audit", label: "Audit", icon: ScrollText },
];

interface SidebarProps {
  user: SessionUser;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 p-2">
      {NAV_ITEMS.filter(
        (item) =>
          !("permission" in item && item.permission) ||
          can(user.tier, item.permission)
      ).map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        const prefetch =
          item.href !== "/dashboard/analytics" &&
          item.href !== "/dashboard/games";
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={prefetch}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "border-l-2 border-accent bg-surface-hover pl-[10px] text-white"
                : "border-l-2 border-transparent text-muted hover:bg-surface-hover hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userBlock = (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2.5 px-2 py-2">
        <Avatar
          userId={user.id}
          avatarHash={user.avatar}
          size={32}
          alt={user.username}
        />
        <div className="min-w-0 flex-1">
          <ViewerHighlightSpan userId={user.id}>
            <p className="truncate text-sm font-medium text-white">
              {user.globalName || user.username}
            </p>
          </ViewerHighlightSpan>
          <p className={cn("text-xs", tierColor(user.tier))}>
            {tierLabel(user.tier)}
          </p>
        </div>
      </div>
      <Link
        href="/api/auth/logout"
        prefetch={false}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Link>
    </div>
  );

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-white">Bots</span>
      </div>
      {nav}
      {userBlock}
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md border border-border bg-surface p-2 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border bg-surface lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 rounded-md p-1 text-muted hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
