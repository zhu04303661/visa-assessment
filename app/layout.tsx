import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { LanguageProvider } from "@/lib/i18n"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "惜池移民 | Xichi Immigration - 专业英国移民服务",
  description: "惜池移民提供专业的英国移民和签证服务，包括创业移民、全球人才签证(GTV)、技术工作签证等。AI智能评估，专家一对一咨询。",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* Wrapped children with LanguageProvider and Suspense boundary */}
        <Suspense fallback={<div>Loading...</div>}>
          <LanguageProvider>{children}</LanguageProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
