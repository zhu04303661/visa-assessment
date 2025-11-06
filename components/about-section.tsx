"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Building2, Target, Heart, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n"

export function AboutSection() {
  const { t, language } = useLanguage()

  const values = [
    {
      icon: Target,
      title: language === "en" ? "Mission-Driven" : "使命驱动",
      description: language === "en"
        ? "Helping talented individuals achieve their UK immigration dreams"
        : "帮助有才华的人实现英国移民梦想"
    },
    {
      icon: Heart,
      title: language === "en" ? "Client-Focused" : "客户至上",
      description: language === "en"
        ? "Every client's success is our top priority"
        : "每个客户的成功都是我们的首要任务"
    },
    {
      icon: TrendingUp,
      title: language === "en" ? "Innovation" : "创新引领",
      description: language === "en"
        ? "Using AI and technology to provide better services"
        : "运用AI和技术提供更优质的服务"
    }
  ]

  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          {/* Left side - Content */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Building2 className="h-4 w-4" />
              <span>{language === "en" ? "About Xichi Immigration" : "关于惜池移民"}</span>
            </div>
            <h2 className="mb-6 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {language === "en" 
                ? "Your Trusted UK Immigration Partner" 
                : "您值得信赖的英国移民伙伴"}
            </h2>
            <p className="mb-6 text-pretty text-lg leading-relaxed text-muted-foreground">
              {language === "en"
                ? "Xichi Immigration is a professional UK immigration service provider. We are committed to providing the most professional, efficient, and secure UK immigration services. With years of experience and a team of expert consultants, we help talented individuals and entrepreneurs achieve their UK immigration goals through comprehensive services including Startup Visa, Global Talent Visa (GTV), Skilled Worker Visa, and other UK immigration solutions."
                : "惜池移民是一家专业的英国移民服务供应商。我们致力于为您提供最专业、最高效、最安全的英国移民服务。凭借多年的经验和专业的顾问团队，我们帮助有才华的个人和企业家实现英国移民目标，提供包括创业签证、全球人才签证（GTV）、技术工作签证和其他英国移民解决方案在内的全方位服务。"}
            </p>
            <p className="mb-8 text-pretty text-lg leading-relaxed text-muted-foreground">
              {language === "en"
                ? "We combine traditional expertise with cutting-edge AI technology to provide accurate assessments, personalized guidance, and professional support throughout your immigration journey. Welcome to partner with Xichi to create a better future together. We look forward to providing you with the most professional, efficient, and secure UK immigration services."
                : "我们将传统专业知识与前沿AI技术相结合，为您提供准确的评估、个性化指导和专业支持，全程陪伴您的移民之路。欢迎您与惜池携手合作，共创美好未来。我们期待为您提供最专业、最高效、最安全的英国移民服务。"}
            </p>
            <Button asChild size="lg" className="group">
              <Link href="/about">
                {language === "en" ? "Learn More About Us" : "了解更多"}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          {/* Right side - Values */}
          <div className="grid gap-6">
            {values.map((value) => {
              const Icon = value.icon
              return (
                <Card key={value.title} className="border-border/50 transition-all hover:border-primary/50 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-3 flex-shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-xl font-semibold text-foreground">{value.title}</h3>
                        <p className="text-muted-foreground">{value.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

