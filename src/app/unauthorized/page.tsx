import { PublicShell } from "@/components/landing/LandingSections";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

export default function UnauthorizedPage() {
  return (
    <PublicShell>
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs border border-[#d4d4d4] bg-[#f4f4f4] px-6 py-8 text-center shadow-sm">
          <h1 className="text-[15px] font-normal text-[#444]">Access denied</h1>
          <p className="mt-3 text-[12px] text-[#777]">
            This account is not permitted to use this service.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/api/auth/logout"
              prefetch={false}
              className="inline-block w-full border border-[#bbb] bg-[#e0e0e0] px-4 py-2 text-[13px] text-[#333] no-underline hover:bg-[#d6d6d6]"
            >
              Sign out
            </Link>
            <Link
              href="/"
              className="inline-block text-[11px] text-[#999] no-underline hover:text-[#777]"
            >
              Back
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
