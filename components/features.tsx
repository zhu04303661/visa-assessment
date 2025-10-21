"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, FileCheck, Target, TrendingUp, Users, Shield } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export function Features() {
  const { t } = useLanguage()

  const features = [
    {
      icon: Brain,
      title: t("features.ai.title"),
      description: t("features.ai.desc"),
    },
    {
      icon: FileCheck,
      title: t("features.comprehensive.title"),
      description: t("features.comprehensive.desc"),
    },
    {
      icon: Target,
      title: t("features.field.title"),
      description: t("features.field.desc"),
    },
    {
      icon: TrendingUp,
      title: t("features.success.title"),
      description: t("features.success.desc"),
    },
    {
      icon: Users,
      title: t("features.personalized.title"),
      description: t("features.personalized.desc"),
    },
    {
      icon: Shield,
      title: t("features.secure.title"),
      description: t("features.secure.desc"),
    },
  ]

  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            {t("features.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">{t("features.subtitle")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.title}
                className="border-border/50 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
