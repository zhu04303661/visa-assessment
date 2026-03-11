import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "材料收集 - GTV签证申请材料管理",
  description:
    "使用惜池集团材料收集系统，系统化收集和管理您的GTV签证申请所需材料，一站式材料管理体验。",
  openGraph: {
    title: "材料收集 - 惜池集团",
    description: "系统化收集和管理GTV签证申请所需材料。",
    url: "https://xichigroup.com.cn/material-collection",
  },
  alternates: {
    canonical: "https://xichigroup.com.cn/material-collection",
  },
}

export default function MaterialCollectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
