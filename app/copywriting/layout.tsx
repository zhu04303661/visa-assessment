import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "文案服务 - GTV签证申请文案撰写",
  description:
    "惜池集团专业文案服务：AI辅助撰写GTV签证申请材料，包括个人陈述、推荐信框架、证据整理等，提升申请成功率。",
  openGraph: {
    title: "文案服务 - 惜池集团",
    description:
      "AI辅助撰写GTV签证申请材料，包括个人陈述、推荐信、证据整理等。",
    url: "https://xichigroup.com.cn/copywriting",
  },
  alternates: {
    canonical: "https://xichigroup.com.cn/copywriting",
  },
}

export default function CopywritingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
