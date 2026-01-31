import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell";
import NextTopLoader from 'nextjs-toploader';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_NEXTAUTH_URL || "http://localhost:3000"),
  title: "ReviewScope",
  description:
    "Engineering-quality code on autopilot. Professional AI reviews for GitHub pull requests that combine static analysis with Gemini/OpenAI models, powered by your own API keys.",
  icons: {
    icon: "/logo2.jpeg",
  },
  openGraph: {
    title: "ReviewScope – Engineering Quality on Autopilot",
    description:
      "Professional AI code reviews that understand your context. Secure, logic-aware, and powered by your own API keys.",
    images: [
      {
        url: "/image.png",
        alt: "ReviewScope hero showing Engineering Quality on Autopilot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ReviewScope – Engineering Quality on Autopilot",
    description:
      "AI-powered code reviews for GitHub pull requests, combining static analysis with Gemini/OpenAI models and your own API keys.",
    images: ["/image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="aad390a0-befb-424e-a755-6ef57aa9157f"
        ></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col overflow-x-hidden`}
      >
        <NextTopLoader color="#18181b" showSpinner={false} />
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
