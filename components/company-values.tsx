"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Award, Shield, Zap, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { ScrollReveal, StaggerContainer, StaggerItem, CounterAnimation } from "@/components/animations"
import { motion } from "framer-motion"

export function CompanyValues() {
  const { language } = useLanguage()

  const values = [
    {
      icon: Award,
      title: language === "en" ? "Most Professional" : "最专业",
      description: language === "en"
        ? "Expert team with years of experience in UK immigration, providing authoritative guidance"
        : "经验丰富的专业团队，深耕英国移民领域多年，提供权威指导",
      features: language === "en"
        ? ["Expert Consultants", "Years of Experience", "Authoritative Guidance"]
        : ["专业顾问团队", "多年行业经验", "权威专业指导"]
    },
    {
      icon: Zap,
      title: language === "en" ? "Most Efficient" : "最高效",
      description: language === "en"
        ? "Streamlined process with AI-powered assessment, saving your time and effort"
        : "高效流程，AI智能评估加速申请，节省您的时间和精力",
      features: language === "en"
        ? ["AI-Powered Assessment", "Streamlined Process", "Fast Response"]
        : ["AI智能评估", "高效流程", "快速响应"]
    },
    {
      icon: Shield,
      title: language === "en" ? "Most Secure" : "最安全",
      description: language === "en"
        ? "Secure and confidential service, strictly protecting your privacy and information"
        : "安全可靠的服务，严格保护客户隐私和信息安全",
      features: language === "en"
        ? ["Data Security", "Privacy Protection", "Confidential Service"]
        : ["数据安全", "隐私保护", "保密服务"]
    }
  ]

  // 统计数据
  const stats = [
    { value: 500, suffix: "+", label: language === "en" ? "Success Cases" : "成功案例" },
    { value: 98, suffix: "%", label: language === "en" ? "Approval Rate" : "通过率" },
    { value: 10, suffix: "+", label: language === "en" ? "Years Experience" : "年专业经验" }
  ]

  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        {/* 统计数据区域 */}
        <div className="mb-20 grid gap-8 md:grid-cols-3">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.1}>
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="text-5xl font-bold text-primary mb-2">
                  <CounterAnimation
                    value={stat.value}
                    suffix={stat.suffix}
                    delay={index * 0.2}
                    duration={2}
                  />
                </div>
                <p className="text-muted-foreground font-medium">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mb-16 text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            {language === "en" ? "Why Choose Xichi?" : "为什么选择惜池？"}
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">
            {language === "en"
              ? "We are committed to providing the most professional, efficient, and secure UK immigration services"
              : "我们致力于为您提供最专业、最高效、最安全的英国移民服务"}
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid gap-8 md:grid-cols-3">
          {values.map((value, valueIndex) => {
            const Icon = value.icon
            return (
              <StaggerItem key={value.title}>
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <Card
                    className="group relative overflow-hidden border-border/50 transition-all hover:border-primary/50 hover:shadow-xl h-full"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity group-hover:opacity-100" />
                    <CardContent className="relative p-8">
                      <motion.div 
                        className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Icon className="h-8 w-8" />
                      </motion.div>
                      <h3 className="mb-3 text-2xl font-bold text-foreground">{value.title}</h3>
                      <p className="mb-6 text-muted-foreground leading-relaxed">{value.description}</p>
                      <ul className="space-y-2">
                        {value.features.map((feature, index) => (
                          <motion.li 
                            key={index} 
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            viewport={{ once: true }}
                          >
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                            <span>{feature}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>
    </section>
  )
}

