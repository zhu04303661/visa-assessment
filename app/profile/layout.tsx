import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "个人中心 - 管理您的账户",
  description: "管理您的惜池集团账户信息、查看评估历史和咨询记录。",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
