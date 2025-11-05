"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, CheckCircle2, MessageCircle, Upload, Settings, Target } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n"

export function AssessmentCTA() {
  const { t, language } = useLanguage()

  const benefits =
    language === "en"
      ? [
          "Complete assessment in 10-15 minutes",
          "Instant AI-powered results",
          "Detailed eligibility breakdown",
          "Actionable improvement suggestions",
          "No registration required",
        ]
      : ["10-15分钟完成评估", "即时AI智能结果", "详细的资格分析", "可操作的改进建议", "无需注册"]

  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative px-6 py-12 md:px-12 md:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                {t("cta.title")}
              </h2>
              <p className="mb-8 text-pretty text-lg text-muted-foreground md:text-xl">{t("cta.subtitle")}</p>

              <div className="mb-10 flex flex-col items-center gap-3 text-left sm:mx-auto sm:max-w-md">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                <Button asChild size="lg" className="group text-base">
                  <Link href="/assessment">
                    <Upload className="mr-2 h-5 w-5" />
                    {t("cta.button")}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" className="group text-base bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                  <Link href="/deep-assessment">
                    <Target className="mr-2 h-5 w-5" />
                    {language === "en" ? "Deep Assessment" : "深度资格评估"}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="group text-base">
                  <Link href="/chat">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    {t("cta.chatButton")}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="group text-base">
                  <Link href="/admin">
                    <Settings className="mr-2 h-5 w-5" />
                    知识库管理
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
