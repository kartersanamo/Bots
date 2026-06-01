import { Button } from "@/components/ui/Button";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { AlertCircle, Bot } from "lucide-react";
import Link from "next/link";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <GradientOrb className="-left-32 top-20" />
      <GradientOrb
        className="-right-32 bottom-20"
        color="rgba(109, 40, 217, 0.12)"
        delay={2}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass glow-border rounded-2xl p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-purple shadow-glow-lg">
            <Bot className="h-8 w-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-white">Welcome to Bots</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in with your Discord account to access the Minecadia dashboard.
            Staff roles are required.
          </p>

          {error && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Authentication failed. Please try again.
            </div>
          )}

          <Link href="/api/auth/login" prefetch={false} className="mt-8 block">
            <Button size="lg" className="w-full">
              Log in with Discord
            </Button>
          </Link>

          <Link
            href="/"
            className="mt-4 inline-block text-sm text-muted transition-colors hover:text-accent-light"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
