"use client";

import { Button } from "@/components/ui/Button";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

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
        </div>
      </motion.div>
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
