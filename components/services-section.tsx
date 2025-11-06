"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Rocket, GraduationCap, Briefcase, FileText, ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n"

export function ServicesSection() {
  const { t, language } = useLanguage()

  const services = [
    {
      icon: Rocket,
      title: language === "en" ? "Startup Visa" : "创业移民",
      description: language === "en" 
        ? "Comprehensive support for UK Startup and Innovator Visa applications. From business plan to visa approval, we guide you every step of the way."
        : "为英国创业签证和创新者签证申请提供全方位支持。从商业计划到签证获批，我们全程为您保驾护航。",
      features: language === "en" 
        ? ["Business Plan Development", "Endorsement Application", "Visa Application Support", "Ongoing Compliance"]
        : ["商业计划书撰写", "背书申请支持", "签证申请指导", "后续合规服务"],
      href: "/services/startup",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: GraduationCap,
      title: language === "en" ? "Global Talent Visa (GTV)" : "全球人才签证 (GTV)",
      description: language === "en"
        ? "AI-powered assessment and professional guidance for UK Global Talent Visa. We help exceptional talents secure their UK visa through Tech Nation, Arts Council, or Royal Society endorsements."
        : "AI智能评估和专业指导，助力杰出人才通过Tech Nation、Arts Council或Royal Society背书获得英国全球人才签证。",
      features: language === "en"
        ? ["AI Eligibility Assessment", "Endorsement Strategy", "Application Preparation", "Expert Consultation"]
        : ["AI资格评估", "背书策略制定", "申请材料准备", "专家一对一咨询"],
      href: "/assessment",
      color: "from-purple-500 to-pink-500",
      featured: true
    },
    {
      icon: Briefcase,
      title: language === "en" ? "Skilled Worker Visa" : "技术工作签证",
      description: language === "en"
        ? "Professional assistance for UK Skilled Worker Visa applications. We help you navigate the sponsorship process and secure your UK work visa."
        : "为英国技术工作签证申请提供专业协助。我们帮助您完成雇主担保流程，成功获得英国工作签证。",
      features: language === "en"
        ? ["Sponsor Matching", "Application Support", "Document Preparation", "Interview Preparation"]
        : ["雇主匹配", "申请支持", "材料准备", "面试指导"],
      href: "/services/skilled-worker",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: FileText,
      title: language === "en" ? "Other Visa Services" : "其他签证服务",
      description: language === "en"
        ? "Comprehensive UK immigration services including family visas, student visas, and settlement applications. Expert guidance for all your UK immigration needs."
        : "提供全面的英国移民服务，包括家庭签证、学生签证和永居申请。为您的所有英国移民需求提供专业指导。",
      features: language === "en"
        ? ["Family Visa", "Student Visa", "Settlement Application", "Citizenship Application"]
        : ["家庭签证", "学生签证", "永居申请", "入籍申请"],
      href: "/services/other",
      color: "from-orange-500 to-red-500"
    }
  ]

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            {language === "en" ? "Our Services" : "我们的服务"}
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">
            {language === "en"
              ? "Professional UK immigration services tailored to your needs. We provide the most professional, efficient, and secure services. From startup visas to global talent visas, we provide comprehensive support for your UK immigration journey."
              : "专业的英国移民服务，量身定制您的需求。我们提供最专业、最高效、最安全的服务。从创业签证到全球人才签证，我们为您的英国移民之路提供全方位支持。"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {services.map((service) => {
            const Icon = service.icon
            return (
              <Card
                key={service.title}
                className={`group relative overflow-hidden border-border/50 transition-all hover:border-primary/50 hover:shadow-xl ${
                  service.featured ? "md:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 transition-opacity group-hover:opacity-5`} />
                <CardHeader>
                  <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${service.color} text-white shadow-lg`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <CardTitle className="text-2xl">{service.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed mt-2">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="mb-6 space-y-2">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full group/btn" variant={service.featured ? "default" : "outline"}>
                    <Link href={service.href}>
                      {language === "en" ? "Learn More" : "了解更多"}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

