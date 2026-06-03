import {
  PublicEntryLink,
  PublicShell,
} from "@/components/landing/LandingSections";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in",
  description: "",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}

function loginErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case "auth_failed":
      return "Could not complete sign-in. Try again.";
    case "rate_limited":
      return "Too many attempts. Wait a moment and try again.";
    case "server_config":
      return "Service unavailable. Try again later.";
    default:
      return code ? "Could not complete sign-in. Try again." : null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = loginErrorMessage(error);

  return (
    <PublicShell>
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs border border-[#d4d4d4] bg-[#f4f4f4] px-6 py-8 text-center shadow-sm">
          <h1 className="text-[15px] font-normal text-[#444]">Sign in</h1>

          {errorMessage && (
            <p className="mt-4 text-[12px] text-[#8b4513]">{errorMessage}</p>
          )}

          <Link
            href="/api/auth/login"
            prefetch={false}
            className="mt-6 inline-block w-full border border-[#bbb] bg-[#e0e0e0] px-4 py-2 text-[13px] text-[#333] no-underline hover:bg-[#d6d6d6]"
          >
            Continue
          </Link>

          <Link
            href="/"
            className="mt-5 inline-block text-[11px] text-[#999] no-underline hover:text-[#777]"
          >
            Back
          </Link>
        </div>
      </div>
      <PublicEntryLink />
    </PublicShell>
  );
}
