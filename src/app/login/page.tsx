import {
  PublicAuthCard,
  PublicBackLink,
  PublicDiscordContinueLink,
  PublicFooter,
  PublicHeader,
  PublicShell,
} from "@/components/landing/LandingSections";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal",
  description: "",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}

function loginErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case "auth_failed":
      return "We could not verify your account. Try again in a moment.";
    case "rate_limited":
      return "Too many attempts. Wait a moment and try again.";
    case "server_config":
      return "The portal is temporarily unavailable. Try again later.";
    default:
      return code ? "Something went wrong. Please try again." : null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = loginErrorMessage(error);

  return (
    <PublicShell>
      <PublicHeader activePath="/login" />
      <PublicAuthCard
        title="Portal"
        subtitle="Use your Discord account to enter. Access is limited to invited members."
        footer={<PublicBackLink />}
      >
        {errorMessage && (
          <p
            className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-center text-sm text-amber-200/90"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        <PublicDiscordContinueLink />
        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          By continuing you confirm you have been given access to this space.
        </p>
      </PublicAuthCard>
      <PublicFooter />
    </PublicShell>
  );
}
