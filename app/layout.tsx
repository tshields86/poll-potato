import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Space_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
  display: "swap",
});

const SITE_URL = process.env.PP_SITE_URL ?? "https://pollpotato.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PollPotato — settle it, fast",
    template: "%s · PollPotato",
  },
  description:
    "Spin up a poll in ten seconds, share one link, watch the votes roll in.",
  applicationName: "PollPotato",
  authors: [{ name: "PollPotato" }],
  keywords: ["poll", "polls", "voting", "quick poll", "online poll", "PollPotato"],
  openGraph: {
    type: "website",
    siteName: "PollPotato",
    title: "PollPotato — settle it, fast",
    description:
      "Spin up a poll in ten seconds, share one link, watch the votes roll in.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "PollPotato — settle it, fast",
    description: "Spin up a poll, share a link, watch the votes roll in.",
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F2FB" },
    { media: "(prefers-color-scheme: dark)", color: "#100E24" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${hanken.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-dvh font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
