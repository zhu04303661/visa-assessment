"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, BookOpen } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"

export function Hero() {
  const { t, language } = useLanguage()

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-0 bottom-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/knowledge-base">
            <BookOpen className="h-4 w-4" />
            {language === "en" ? "Knowledge Base" : "知识库"}
          </Link>
        </Button>
        <LanguageSwitcher />
      </div>

      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            <span>{t("hero.badge")}</span>
          </div>

          {/* Main heading */}
          <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            {t("hero.title")}{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("hero.titleHighlight")}
            </span>
          </h1>

          {/* Subheading */}
          <p className="mb-10 text-pretty text-lg text-muted-foreground md:text-xl lg:text-2xl">{t("hero.subtitle")}</p>

          {/* CTA buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="group text-base">
              <Link href="/assessment">
                {t("hero.cta.start")}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base bg-transparent">
              <Link href="/about">{t("hero.cta.learn")}</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>{t("hero.trust.ai")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>{t("hero.trust.instant")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>{t("hero.trust.personalized")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
