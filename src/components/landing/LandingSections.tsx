"use client";

import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function LandingHero() {
  return (
    <section className="flex min-h-[85vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
        Bots
      </h1>
      <p className="mt-4 max-w-md text-muted">
        Minecadia staff dashboard for bots and server tools.
      </p>
      <Link href="/login" className="mt-8">
        <Button size="lg">Log in with Discord</Button>
      </Link>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted">
      <p>Minecadia · bots.kartersanamo.com</p>
    </footer>
  );
}
