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
    default: "Bots — Minecadia Dashboard",
    template: "%s | Bots",
  },
  description:
    "Manage all Minecadia Discord bots and your server from one modern dashboard.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://bots.kartersanamo.com"
  ),
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
