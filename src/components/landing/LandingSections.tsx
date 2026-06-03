import { cn } from "@/lib/utils";
import { ArrowRight, Layers, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-radial from-accent/20 via-transparent to-transparent opacity-60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent-muted/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex min-h-screen flex-col">{children}</div>
    </div>
  );
}

export function PublicHeader({ activePath }: { activePath?: "/" | "/login" }) {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="safe-area-x mx-auto flex h-14 max-w-5xl items-center justify-between sm:h-16">
        <Link
          href="/"
          className="group flex items-center gap-2.5 no-underline"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-purple shadow-glow">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white group-hover:text-accent-light">
            Bots Dashboard
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/login"
            prefetch={false}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm no-underline transition-colors",
              activePath === "/login"
                ? "bg-surface text-white"
                : "text-muted hover:bg-surface-hover hover:text-white"
            )}
          >
            Portal
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="safe-area-x safe-area-bottom mt-auto border-t border-border/60 py-6 text-center text-xs text-muted sm:py-8">
      <p>© {new Date().getFullYear()} Karter Sanamo</p>
    </footer>
  );
}

export function PublicLandingMain() {
  return (
    <main className="safe-area-x flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
      <section className="w-full max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-accent-light">
          Welcome
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
          Bots Dashboard
        </h1>
        <div className="mt-8 flex flex-col items-stretch gap-4 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
          <Link
            href="/login"
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white no-underline shadow-glow transition-colors hover:bg-accent/90 sm:py-2.5"
          >
            Open portal
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-sm text-muted">
            Already inside?{" "}
            <Link
              href="/login"
              prefetch={false}
              className="text-accent-light no-underline hover:text-white"
            >
              Continue
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export function PublicAuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="safe-area-x flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl border-accent/20 p-6 shadow-glow-lg sm:p-10">
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-purple shadow-glow">
              <Sparkles className="h-5 w-5 text-white" strokeWidth={2} />
            </span>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {subtitle}
              </p>
            )}
          </div>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 border-t border-border pt-6">{footer}</div>}
        </div>
      </div>
    </main>
  );
}

export function PublicDiscordContinueLink({
  className,
  label = "Continue with Discord",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href="/api/auth/login"
      prefetch={false}
      className={cn(
        "flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#5865F2] px-4 py-3 text-sm font-medium text-white no-underline transition-colors hover:bg-[#4752C4]",
        className
      )}
    >
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
      {label}
    </Link>
  );
}

export function PublicBackLink({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="block text-center text-sm text-muted no-underline transition-colors hover:text-white"
    >
      ← Back
    </Link>
  );
}
