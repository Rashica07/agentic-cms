import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3002"),
  ),
  title: {
    default: "Novus Pulse CMS",
    template: "%s · Novus Pulse CMS",
  },
  description:
    "The agentic CMS — pages, structured content, and media for multi-tenant sites, with a visual editor, AI copilot, and live realtime sync.",
  applicationName: "Novus Pulse CMS",
  openGraph: {
    type: "website",
    siteName: "Novus Pulse CMS",
    title: "Novus Pulse CMS",
    description:
      "The agentic CMS — pages, structured content, and media with a live pulse.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Novus Pulse CMS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Novus Pulse CMS",
    description:
      "The agentic CMS — pages, structured content, and media with a live pulse.",
    images: ["/og.png"],
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* No-flash theme: apply the saved theme class before first paint.
            Light is the default; only add `dark` when explicitly chosen. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('np-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
