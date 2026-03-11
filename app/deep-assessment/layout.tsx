import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "深度评估 - 全面GTV签证资格评估",
  description:
    "惜池集团深度评估服务：基于多维度AI分析框架，全面评估您的全球人才签证(GTV)申请资格，提供详尽的评估报告。",
  openGraph: {
    title: "深度评估 - 惜池集团",
    description:
      "基于多维度AI分析框架，全面评估您的GTV签证申请资格。",
    url: "https://xichigroup.com.cn/deep-assessment",
  },
  alternates: {
    canonical: "https://xichigroup.com.cn/deep-assessment",
  },
}

export default function DeepAssessmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
