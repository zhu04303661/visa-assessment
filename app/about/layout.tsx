import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "关于我们 - 专业英国移民服务团队",
  description:
    "了解惜池集团：500+成功案例，95%成功率，10年以上英国移民服务经验。AI智能评估与专家一对一咨询相结合，为您提供最专业的英国移民服务。",
  openGraph: {
    title: "关于我们 - 惜池集团 Xichi Group",
    description:
      "了解惜池集团：500+成功案例，95%成功率，10年以上英国移民服务经验。",
    url: "https://xichigroup.com.cn/about",
  },
  alternates: {
    canonical: "https://xichigroup.com.cn/about",
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
