import { Button } from "@/components/ui/Button";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <GradientOrb
        className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        size="500px"
      />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="glass glow-border rounded-2xl p-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <ShieldX className="h-8 w-8 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="mt-3 text-sm text-muted">
            You don&apos;t have the required staff roles to access this dashboard.
            If you believe this is an error, contact a server administrator.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link href="/api/auth/logout" prefetch={false}>
              <Button variant="secondary" className="w-full">
                Sign out
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="w-full">
                Back to home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
