import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "知识库 - 英国移民政策与GTV签证指南",
  description:
    "惜池集团知识库：全面的英国移民政策解读、GTV全球人才签证申请指南、常见问题解答和最新政策更新。",
  openGraph: {
    title: "知识库 - 惜池集团",
    description:
      "全面的英国移民政策解读、GTV签证申请指南和常见问题解答。",
    url: "https://xichigroup.com.cn/knowledge-base",
  },
  alternates: {
    canonical: "https://xichigroup.com.cn/knowledge-base",
  },
}

export default function KnowledgeBaseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
