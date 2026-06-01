import {
  LandingFooter,
  LandingHero,
} from "@/components/landing/LandingSections";
import Link from "next/link";
import { Bot } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">Bots</span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted transition-colors hover:text-white"
          >
            Log in
          </Link>
        </div>
      </header>

      <LandingHero />
      <LandingFooter />
    </main>
  );
}
