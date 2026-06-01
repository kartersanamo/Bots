import {
  LandingFeatures,
  LandingFooter,
  LandingHero,
} from "@/components/landing/LandingSections";
import Link from "next/link";
import { Bot } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="fixed top-0 z-30 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-purple">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">Bots</span>
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-accent/20 px-4 py-2 text-sm font-medium text-accent-light transition-colors hover:bg-accent/30"
          >
            Log in
          </Link>
        </div>
      </header>

      <div className="pt-16">
        <LandingHero />
        <LandingFeatures />
        <LandingFooter />
      </div>
    </main>
  );
}
