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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                process.env.NEXTAUTH_URL || 
                "https://reviewscope.luffytaro.me";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Review Scope – Automated Code Reviews on Autopilot",
  description:
    "Automated code reviews that go beyond the diff. Catch bugs and enforce standards with an AI that understands your entire repository context.",
  icons: {
    icon: "/logo2.jpeg",
    shortcut: "/logo2.jpeg",
    apple: "/logo2.jpeg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Review Scope",
    title: "Review Scope – Code Reviews on Autopilot",
    description:
      "Automated code reviews that go beyond the diff. Catch bugs and enforce standards with an AI that understands your entire repository context.",
    images: [
      {
        url: `${baseUrl}/hero.png`,
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
    title: "Review Scope – Code Reviews on Autopilot",
    description:
      "Automated code reviews that go beyond the diff. Catch bugs and enforce standards with an AI that understands your entire repository context.",
    images: [`${baseUrl}/hero.png`],
  },
};

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
