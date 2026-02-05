"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, BookOpen } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"
import { motion } from "framer-motion"
import { useState } from "react"
import { TypewriterOnce } from "@/components/animations/typewriter"

export function HeroAnimated() {
  const { t, language } = useLanguage()
  const [titleComplete, setTitleComplete] = useState(false)
  const [highlightComplete, setHighlightComplete] = useState(false)
  const [subtitleComplete, setSubtitleComplete] = useState(false)

  // 服务特点
  const features = language === "en"
    ? ["AI-Powered Assessment", "Expert Guidance", "Fast Processing", "High Success Rate"]
    : ["AI 智能评估", "专家指导", "快速处理", "高成功率"]

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20 min-h-[90vh]">
      {/* 动态背景装饰 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute left-0 bottom-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-primary/5 blur-2xl animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <Button asChild variant="outline" size="sm" className="gap-2 backdrop-blur-sm bg-background/50">
          <Link href="/knowledge-base">
            <BookOpen className="h-4 w-4" />
            {language === "en" ? "Knowledge Base" : "知识库"}
          </Link>
        </Button>
        <LanguageSwitcher />
      </div>

      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge - 动画入场 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-4 py-2 text-sm font-medium text-primary"
          >
            <Sparkles className="h-4 w-4" />
            <span>{t("hero.badge")}</span>
          </motion.div>

          {/* 主标题 - 打字机效果，保持在一行 */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl whitespace-nowrap"
          >
            <TypewriterOnce
              text={t("hero.title")}
              speed={80}
              delay={300}
              cursor={!titleComplete}
              onComplete={() => setTitleComplete(true)}
            />
            {titleComplete && (
              <>
                {" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  <TypewriterOnce
                    text={t("hero.titleHighlight")}
                    speed={80}
                    delay={100}
                    cursor={!highlightComplete}
                    onComplete={() => setHighlightComplete(true)}
                  />
                </span>
              </>
            )}
          </motion.h1>

          {/* 副标题 - 打字机效果 */}
          {highlightComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mb-10"
            >
              <p className="text-pretty text-lg text-muted-foreground md:text-xl lg:text-2xl">
                <TypewriterOnce
                  text={t("hero.subtitle")}
                  speed={30}
                  delay={200}
                  cursor={!subtitleComplete}
                  onComplete={() => setSubtitleComplete(true)}
                />
              </p>
            </motion.div>
          )}

          {/* CTA buttons - 打字完成后显示 */}
          {subtitleComplete && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild size="lg" className="group text-base">
                  <Link href="/assessment">
                    {t("hero.cta.start")}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild variant="outline" size="lg" className="text-base bg-transparent backdrop-blur-sm">
                  <Link href="/about">{t("hero.cta.learn")}</Link>
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* 特性展示 - 打字完成后显示 */}
          {subtitleComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-16"
            >
              {/* 特性标签 */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2"
                  >
                    <motion.div
                      className="h-2 w-2 rounded-full bg-primary"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* 信任指标 */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
                {[
                  { key: "ai", label: t("hero.trust.ai") },
                  { key: "instant", label: t("hero.trust.instant") },
                  { key: "personalized", label: t("hero.trust.personalized") }
                ].map((item, index) => (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
