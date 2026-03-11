import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "材料标签 - GTV签证材料分类管理",
  description:
    "使用惜池集团材料标签系统，高效分类和管理您的GTV签证申请材料，确保材料完整性和组织性。",
  openGraph: {
    title: "材料标签 - 惜池集团",
    description: "高效分类和管理GTV签证申请材料。",
    url: "https://xichigroup.com.cn/material-tags",
  },
  alternates: {
    canonical: "https://xichigroup.com.cn/material-tags",
  },
}

export default function MaterialTagsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
