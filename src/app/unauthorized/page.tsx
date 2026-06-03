import {
  PublicAuthCard,
  PublicBackLink,
  PublicFooter,
  PublicHeader,
  PublicShell,
} from "@/components/landing/LandingSections";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

export default function UnauthorizedPage() {
  return (
    <PublicShell>
      <PublicHeader activePath="/login" />
      <PublicAuthCard
        title="Access denied"
        subtitle="This Discord account is not on the member list for this portal."
        footer={<PublicBackLink />}
      >
        <Link
          href="/api/auth/logout"
          prefetch={false}
          className="flex w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-white no-underline transition-colors hover:bg-surface-hover"
        >
          Use a different account
        </Link>
      </PublicAuthCard>
      <PublicFooter />
    </PublicShell>
  );
}
