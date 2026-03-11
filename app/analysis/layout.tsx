import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "深度分析 - GTV签证申请材料分析",
  description:
    "对您的GTV签证申请材料进行深度AI分析，识别优势与不足，提供针对性的材料优化建议。",
  openGraph: {
    title: "深度分析 - 惜池集团",
    description: "AI深度分析GTV签证申请材料，提供针对性优化建议。",
    url: "https://xichigroup.com.cn/analysis",
  },
  alternates: {
    canonical: "https://xichigroup.com.cn/analysis",
  },
}

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
