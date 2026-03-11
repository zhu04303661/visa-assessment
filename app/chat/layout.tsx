import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI智能咨询 - 英国移民在线问答",
  description:
    "与惜池集团AI助手实时对话，获取英国移民、GTV签证、创业移民等专业咨询。24/7全天候在线服务，即时解答您的移民疑问。",
  openGraph: {
    title: "AI智能咨询 - 惜池集团",
    description:
      "与AI助手实时对话，获取英国移民、GTV签证等专业咨询。24/7全天候在线服务。",
    url: "https://xichigroup.com.cn/chat",
  },
  alternates: {
    canonical: "https://xichigroup.com.cn/chat",
  },
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
