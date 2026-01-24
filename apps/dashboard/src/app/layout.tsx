import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
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
    <html lang="en" className="light overflow-x-hidden">
      <head>
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="aad390a0-befb-424e-a755-6ef57aa9157f"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col overflow-x-hidden`}
      >
        <Providers>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
