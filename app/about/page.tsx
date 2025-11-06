"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Target, Users, Award, Heart, TrendingUp, ArrowRight, Mail, Phone } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import Link from "next/link"

export default function AboutPage() {
  const { language } = useLanguage()

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

  const stats = [
    {
      number: "500+",
      label: language === "en" ? "Successful Cases" : "成功案例"
    },
    {
      number: "95%",
      label: language === "en" ? "Success Rate" : "成功率"
    },
    {
      number: "10+",
      label: language === "en" ? "Years Experience" : "年经验"
    },
    {
      number: "24/7",
      label: language === "en" ? "AI Support" : "AI支持"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Building2 className="h-4 w-4" />
            <span>{language === "en" ? "About Xichi Immigration" : "关于惜池移民"}</span>
          </div>
          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {language === "en" 
              ? "Your Trusted UK Immigration Partner" 
              : "您值得信赖的英国移民伙伴"}
          </h1>
          <p className="mx-auto max-w-3xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            {language === "en"
              ? "Xichi Immigration is a professional UK immigration service provider. We are committed to providing the most professional, efficient, and secure UK immigration services. Welcome to partner with Xichi to create a better future together. We look forward to providing you with the most professional, efficient, and secure UK immigration services."
              : "惜池移民是一家专业的英国移民服务供应商。我们致力于为您提供最专业、最高效、最安全的英国移民服务。欢迎您与惜池携手合作，共创美好未来。我们期待为您提供最专业、最高效、最安全的英国移民服务。"}
          </p>
        </div>

        {/* Stats Section */}
        <div className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-border/50 text-center">
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {language === "en" ? "Our Values" : "我们的价值观"}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((value) => {
              const Icon = value.icon
              return (
                <Card key={value.title} className="border-border/50 transition-all hover:border-primary/50 hover:shadow-lg">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {language === "en" ? "Why Choose Xichi Immigration?" : "为什么选择惜池移民？"}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Award className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">
                  {language === "en" ? "Expert Team" : "专业团队"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {language === "en"
                    ? "Our team consists of experienced immigration consultants with deep knowledge of UK immigration laws and regulations. We stay updated with the latest policy changes to provide you with the most accurate advice."
                    : "我们的团队由经验丰富的移民顾问组成，对英国移民法律法规有深入了解。我们及时跟进最新政策变化，为您提供最准确的建议。"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">
                  {language === "en" ? "Personalized Service" : "个性化服务"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {language === "en"
                    ? "We understand that every client's situation is unique. Our consultants work closely with you to develop a customized immigration strategy that fits your specific needs and goals."
                    : "我们深知每个客户的情况都是独特的。我们的顾问将与您密切合作，制定符合您特定需求和目标的定制化移民策略。"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">
                  {language === "en" ? "AI-Powered Assessment" : "AI智能评估"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {language === "en"
                    ? "We combine traditional expertise with cutting-edge AI technology to provide accurate eligibility assessments and personalized recommendations. Our AI system helps identify your strengths and areas for improvement."
                    : "我们将传统专业知识与前沿AI技术相结合，提供准确的资格评估和个性化建议。我们的AI系统帮助识别您的优势和需要改进的领域。"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Heart className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">
                  {language === "en" ? "Comprehensive Support" : "全方位支持"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {language === "en"
                    ? "From initial assessment to visa approval and beyond, we provide comprehensive support throughout your entire immigration journey. We're here to help you every step of the way."
                    : "从初步评估到签证获批及后续服务，我们在您的整个移民过程中提供全方位支持。我们全程陪伴您的每一步。"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <CardContent className="p-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              {language === "en" ? "Ready to Start Your UK Immigration Journey?" : "准备好开始您的英国移民之旅了吗？"}
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              {language === "en"
                ? "Get started with our free GTV assessment or schedule a consultation with our experts."
                : "从我们的免费GTV评估开始，或预约与我们的专家进行咨询。"}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="group">
                <Link href="/assessment">
                  {language === "en" ? "Free GTV Assessment" : "免费GTV评估"}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="group">
                <Link href="/chat">
                  {language === "en" ? "AI Consultation" : "AI智能咨询"}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <h2 className="mb-6 text-3xl font-bold text-foreground">
            {language === "en" ? "Get in Touch" : "联系我们"}
          </h2>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-5 w-5" />
              <span>info@xichigroup.com.cn</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-5 w-5" />
              <span>{language === "en" ? "Contact us via email" : "请通过邮箱联系我们"}</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

