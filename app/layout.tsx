import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { LanguageProvider } from "@/lib/i18n"
import { AuthProvider } from "@/lib/auth/auth-context"
import { PageTracker } from "@/components/page-tracker"
import { OrganizationJsonLd, WebSiteJsonLd, ProfessionalServiceJsonLd } from "@/components/structured-data"
import { Suspense } from "react"

export const metadata: Metadata = {
  metadataBase: new URL("https://xichigroup.com.cn"),
  title: {
    default: "惜池集团 | Xichi Group - 专业英国移民服务",
    template: "%s | 惜池集团 Xichi Group",
  },
  description:
    "惜池集团提供专业的英国移民和签证服务，包括创业移民、全球人才签证(GTV)、技术工作签证等。AI智能评估，专家一对一咨询。",
  keywords: [
    "英国移民",
    "GTV签证",
    "全球人才签证",
    "Global Talent Visa",
    "UK immigration",
    "英国签证",
    "创业移民",
    "技术工作签证",
    "惜池集团",
    "Xichi Group",
    "AI签证评估",
    "移民咨询",
  ],
  authors: [{ name: "惜池集团 Xichi Group", url: "https://xichigroup.com.cn" }],
  creator: "惜池集团 Xichi Group",
  publisher: "惜池集团 Xichi Group",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    alternateLocale: "en_GB",
    siteName: "惜池集团 Xichi Group",
    title: "惜池集团 | Xichi Group - 专业英国移民服务",
    description:
      "惜池集团提供专业的英国移民和签证服务，包括创业移民、全球人才签证(GTV)、技术工作签证等。AI智能评估，专家一对一咨询。",
    url: "https://xichigroup.com.cn",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "惜池集团 Xichi Group - 专业英国移民服务",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "惜池集团 | Xichi Group - 专业英国移民服务",
    description:
      "惜池集团提供专业的英国移民和签证服务，包括创业移民、全球人才签证(GTV)、技术工作签证等。AI智能评估，专家一对一咨询。",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://xichigroup.com.cn",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <ProfessionalServiceJsonLd />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <LanguageProvider>
            <AuthProvider>
              <PageTracker />
              {children}
            </AuthProvider>
          </LanguageProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
