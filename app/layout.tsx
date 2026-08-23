import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VAYTU",
  // Was "Application foundation (fase pre-onboarding)" — internal development
  // status, and this string is what search results and link previews show.
  description:
    "VAYTU mette in contatto Creator e attività locali attraverso Experience e collaborazioni reali.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      // The entire interface is Italian; lang="en" made screen readers
      // pronounce it with English phonetics.
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
