"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { BOT_REGISTRY } from "@/lib/bots/registry";
import { motion } from "framer-motion";
import {
  Bot,
  Gamepad2,
  Shield,
  Ticket,
  Users,
  Wrench,
  Crown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ElementType } from "react";

const ICON_MAP: Record<string, ElementType> = {
  Gamepad2,
  Ticket,
  Shield,
  Wrench,
  Users,
  Crown,
};

export function LandingHero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <GradientOrb className="-left-32 top-20" delay={0} />
      <GradientOrb
        className="-right-32 bottom-20"
        color="rgba(109, 40, 217, 0.12)"
        delay={2}
      />
      <GradientOrb
        className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        color="rgba(192, 132, 252, 0.08)"
        size="600px"
        delay={4}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-3xl"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent-light"
        >
          <Sparkles className="h-4 w-4" />
          Minecadia Bot Fleet Dashboard
        </motion.div>

        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
          <span className="text-gradient">Bots</span>
        </h1>

        <p className="mt-6 text-lg text-muted md:text-xl">
          Manage all six Minecadia Discord bots and your entire server from one
          sleek, modern dashboard.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/login">
            <Button size="lg" className="group">
              Log in with Discord
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="/dashboard/docs">
            <Button variant="secondary" size="lg">
              View Roadmap
            </Button>
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="relative z-10 mt-20 grid w-full max-w-5xl grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6"
      >
        {BOT_REGISTRY.map((bot, i) => {
          const Icon = ICON_MAP[bot.icon] || Bot;
          return (
            <motion.div
              key={bot.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
            >
              <Card
                className="p-4 text-center"
                hover
                style={{ borderColor: `${bot.accentColor}30` }}
              >
                <div
                  className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${bot.accentColor}20` }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: bot.accentColor }}
                  />
                </div>
                <p className="text-xs font-medium text-white">{bot.shortName}</p>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

export function LandingFeatures() {
  const features = [
    {
      title: "Full Bot Fleet",
      description:
        "Monitor and manage Games, Tickets, Management, Utilities, Staff, and Leader bots.",
    },
    {
      title: "Role-Based Access",
      description:
        "Staff tiers from Helper to Owner — everyone sees exactly what they need.",
    },
    {
      title: "Server Overview",
      description:
        "Live guild stats, channels, roles, and member counts at a glance.",
    },
    {
      title: "Built for Growth",
      description:
        "Phase 1 read-only today. Full bot control, analytics, and moderation coming next.",
    },
  ];

  return (
    <section className="relative px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center text-3xl font-bold text-white">
          Everything in one place
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card hover glow className="h-full">
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted">
      <p>
        <span className="font-semibold text-accent-light">Bots</span> — Minecadia
        Discord Dashboard
      </p>
      <p className="mt-1">
        <a
          href="https://bots.kartersanamo.com"
          className="hover:text-accent-light transition-colors"
        >
          bots.kartersanamo.com
        </a>
      </p>
    </footer>
  );
}
