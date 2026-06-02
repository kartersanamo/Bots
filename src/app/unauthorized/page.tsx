import { Button } from "@/components/ui/Button";
import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-red-500/10">
          <ShieldX className="h-6 w-6 text-red-400" />
        </div>

        <h1 className="text-xl font-semibold text-white">No access</h1>
        <p className="mt-2 text-sm text-muted">
          You need the <span className="text-white">Staff Team</span> role or the{" "}
          <span className="font-mono text-white">*</span> permission role on the
          Minecadia Discord server to use this dashboard.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/api/auth/logout" prefetch={false}>
            <Button variant="secondary" className="w-full">
              Sign out
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full">
              Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
