import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell";
import NextTopLoader from 'nextjs-toploader';
import Script from 'next/script';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  title: "ReviewScope – Open-Source AI PR Reviewer for GitHub | Automated Code Reviews",
  description:
    "ReviewScope is an open-source AI PR reviewer for GitHub that goes beyond the diff. Uses AST-based analysis and issue validation to deliver low-noise, actionable code reviews. Bring your own API key.",
  icons: {
    icon: "/logo2.jpeg",
    shortcut: "/logo2.jpeg",
    apple: "/logo2.jpeg",
  },
  openGraph: {
  type: "website",
  locale: "en_US",
  url: "https://reviewscope.luffytaro.me",
  siteName: "Review Scope",
  title: "ReviewScope – Open-Source AI PR Reviewer for GitHub | Automated Code Reviews",
  description:
    "ReviewScope is an open-source AI PR reviewer for GitHub that goes beyond the diff. Uses AST-based analysis and issue validation to deliver low-noise, actionable code reviews. Bring your own API key.",
  images: [
    {
      url: "https://reviewscope.luffytaro.me/hero.png",
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "ReviewScope hero showing code reviews on autopilot",
    },
  ],
},
twitter: {
  card: "summary_large_image",
  site: "@reviewscope",
  title: "ReviewScope – Open-Source AI PR Reviewer for GitHub | Automated Code Reviews",
  description:
    "ReviewScope is an open-source AI PR reviewer for GitHub that goes beyond the diff. Uses AST-based analysis and issue validation to deliver low-noise, actionable code reviews. Bring your own API key.",
  images: [
    {
      url: "https://reviewscope.luffytaro.me/hero.png",
      width: 1200,
      height: 630,
      alt: "ReviewScope hero showing code reviews on autopilot",
    },
  ],
},
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col overflow-x-hidden`}
      >
        <NextTopLoader color="#18181b" showSpinner={false} />
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="aad390a0-befb-424e-a755-6ef57aa9157f"
          strategy="afterInteractive"
        />
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
