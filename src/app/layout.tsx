import { ChunkLoadRecovery } from "@/components/ChunkLoadRecovery";
import { env } from "@/lib/env";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "kartersanamo.com",
    template: "%s",
  },
  description: "",
  metadataBase: new URL(
    env("NEXT_PUBLIC_APP_URL") || "https://bots.kartersanamo.com"
  ),
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <ChunkLoadRecovery />
      </body>
    </html>
  );
}
