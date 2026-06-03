import Link from "next/link";
import type { ReactNode } from "react";

/** Public-facing shell — intentionally generic, no product branding. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#e8e8e8] font-[system-ui,-apple-system,Segoe_UI,Roboto,sans-serif] text-[13px] leading-normal text-[#555]">
      {children}
    </div>
  );
}

export function PublicPlaceholder() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="max-w-md text-center text-[#666]">
          There is no content published at this address.
        </p>
      </div>
      <footer className="px-6 pb-8 text-center text-[11px] text-[#999]">
        © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

/** Unlabeled entry point — visible only on hover/focus. */
export function PublicEntryLink() {
  return (
    <Link
      href="/login"
      prefetch={false}
      className="fixed bottom-2 right-2 z-10 block h-6 w-6 rounded-sm text-[11px] leading-6 text-[#c8c8c8] no-underline opacity-0 transition-opacity hover:text-[#aaa] hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#bbb]"
      aria-label="Sign in"
    >
      ·
    </Link>
  );
}
