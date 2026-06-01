"use client";

import type { SessionUser } from "@/lib/auth/session";
import { tierColor, tierLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Bot,
  LayoutDashboard,
  LogOut,
  Menu,
  Server,
  Shield,
  ScrollText,
  Ticket,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/tickets", label: "Tickets", icon: Ticket },
  { href: "/dashboard/bots", label: "Bots", icon: Bot },
  { href: "/dashboard/server", label: "Server", icon: Server },
  { href: "/dashboard/moderation", label: "Moderation", icon: Shield },
  { href: "/dashboard/audit", label: "Audit", icon: ScrollText },
  { href: "/dashboard/docs", label: "Docs", icon: BookOpen },
];

interface SidebarProps {
  user: SessionUser;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-accent/20 text-accent-light shadow-glow"
                : "text-muted hover:bg-surface-hover hover:text-white"
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
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <Avatar
          userId={user.id}
          avatarHash={user.avatar}
          size={36}
          alt={user.username}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {user.globalName || user.username}
          </p>
          <p className={cn("text-xs", tierColor(user.tier))}>
            {tierLabel(user.tier)}
          </p>
        </div>
      </div>
      <Link
        href="/api/auth/logout"
        prefetch={false}
        className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-red-400"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Link>
    </div>
  );

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-purple">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Bots</p>
          <p className="text-xs text-muted">Minecadia</p>
        </div>
      </div>
      {nav}
      {userBlock}
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-surface p-2 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface/50 lg:flex">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-surface lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 rounded-lg p-1 text-muted hover:text-white"
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
