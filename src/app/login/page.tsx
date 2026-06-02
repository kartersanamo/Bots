import { Button } from "@/components/ui/Button";
import { AlertCircle, Bot } from "lucide-react";
import Link from "next/link";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}

function loginErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case "auth_failed":
      return "Sign-in failed. Try again.";
    case "rate_limited":
      return "Too many sign-in attempts. Wait a minute and try again.";
    case "server_config":
      return "The dashboard could not start a session. Contact an administrator (server SESSION_SECRET).";
    default:
      return code ? "Sign-in failed. Try again." : null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = loginErrorMessage(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-accent">
          <Bot className="h-6 w-6 text-white" />
        </div>

        <h1 className="text-xl font-semibold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Staff Discord account required.</p>

        {errorMessage && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <Link href="/api/auth/login" prefetch={false} className="mt-6 block">
          <Button size="lg" className="w-full">
            Log in with Discord
          </Button>
        </Link>

        <Link
          href="/"
          className="mt-4 inline-block text-sm text-muted hover:text-white"
        >
          Back
        </Link>
      </div>
    </main>
  );
}
