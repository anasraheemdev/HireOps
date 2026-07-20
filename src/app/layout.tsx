import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { LangProvider } from "@/lib/i18n";
import { QueryProvider } from "@/components/providers/query-provider";
import { BRAND } from "@/lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  title: {
    default: BRAND.windowTitle,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.metaDescription,
  applicationName: BRAND.name,
  authors: [{ name: BRAND.name }],
  generator: BRAND.name,
  keywords: [
    "HireOps",
    "AI recruitment",
    "talent acquisition",
    "AI interviews",
    "candidate matching",
    "HR operations",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: BRAND.accent }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BRAND.siteUrl,
    siteName: BRAND.name,
    title: BRAND.metaTitle,
    description: BRAND.metaDescription,
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: BRAND.metaTitle,
    description: BRAND.metaDescription,
    images: ["/android-chrome-512x512.png"],
  },
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "black-translucent",
  },
  other: {
    "msapplication-TileColor": BRAND.themeColor,
  },
};

export const viewport: Viewport = {
  themeColor: BRAND.themeColor,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: BRAND.metaDescription,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <html
      lang="en"
      dir="ltr"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col app-shell-bg text-foreground" suppressHydrationWarning>
        <QueryProvider>
          <LangProvider>
            <TooltipProvider delay={200}>
              {children}
              <Toaster richColors position="top-right" theme="dark" />
            </TooltipProvider>
          </LangProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
