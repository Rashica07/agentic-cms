import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const uiFont = Instrument_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const dataFont = JetBrains_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3002"),
  ),
  title: {
    default: "OMNI CMS",
    template: "%s · OMNI CMS",
  },
  description:
    "OMNI CMS — structured content, pages, media and publishing for your sites, with a visual editor and an AI copilot.",
  applicationName: "OMNI CMS",
  openGraph: {
    type: "website",
    siteName: "OMNI CMS",
    title: "OMNI CMS",
    description: "Structured content, pages, media and publishing for your sites.",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${uiFont.variable} ${dataFont.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
