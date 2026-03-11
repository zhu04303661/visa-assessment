import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "评估结果 - GTV签证申请评估报告",
  description:
    "查看您的GTV全球人才签证评估结果，包含详细的评分报告、优势分析和改进建议。",
  openGraph: {
    title: "评估结果 - 惜池集团",
    description: "查看您的GTV全球人才签证评估结果和详细报告。",
    url: "https://xichigroup.com.cn/results",
  },
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "https://xichigroup.com.cn/results",
  },
}

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
