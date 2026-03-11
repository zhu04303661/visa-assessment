import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "GTV签证智能评估 - AI在线评估您的申请资格",
  description:
    "使用惜池集团AI智能评估系统，快速了解您的全球人才签证(GTV)申请资格。基于英国移民局最新标准，提供专业评估报告和个性化建议。",
  openGraph: {
    title: "GTV签证智能评估 - 惜池集团",
    description:
      "AI智能评估您的全球人才签证(GTV)申请资格，提供专业评估报告和个性化建议。",
    url: "https://xichigroup.com.cn/assessment",
  },
  alternates: {
    canonical: "https://xichigroup.com.cn/assessment",
  },
}

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
