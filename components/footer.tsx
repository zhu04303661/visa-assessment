"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n"
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react"

export function Footer() {
  const { t, language } = useLanguage()

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                惜
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {language === "en" ? "Xichi Immigration" : "惜池移民"}
              </h3>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              {language === "en"
                ? "Professional UK immigration service provider. We provide the most professional, efficient, and secure UK immigration services. Welcome to partner with Xichi to create a better future together."
                : "专业的英国移民服务供应商。我们提供最专业、最高效、最安全的英国移民服务。欢迎您与惜池携手合作，共创美好未来。"}
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>info@xichigroup.com.cn</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{language === "en" ? "Contact us via email" : "请通过邮箱联系我们"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{language === "en" ? "UK Immigration Service Provider" : "英国移民服务供应商"}</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">
              {language === "en" ? "Services" : "服务项目"}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/assessment" className="hover:text-foreground transition-colors">
                  {language === "en" ? "GTV Assessment" : "GTV资格评估"}
                </Link>
              </li>
              <li>
                <Link href="/services/startup" className="hover:text-foreground transition-colors">
                  {language === "en" ? "Startup Visa" : "创业移民"}
                </Link>
              </li>
              <li>
                <Link href="/services/skilled-worker" className="hover:text-foreground transition-colors">
                  {language === "en" ? "Skilled Worker Visa" : "技术工作签证"}
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-foreground transition-colors">
                  {language === "en" ? "AI Consultation" : "AI智能咨询"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">
              {language === "en" ? "Resources" : "资源"}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  {language === "en" ? "About Us" : "关于我们"}
                </Link>
              </li>
              <li>
                <Link href="/criteria" className="hover:text-foreground transition-colors">
                  {language === "en" ? "Eligibility Criteria" : "资格标准"}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground transition-colors">
                  {language === "en" ? "FAQ" : "常见问题"}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  {language === "en" ? "Privacy Policy" : "隐私政策"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {language === "en" ? "Xichi Immigration" : "惜池移民"}.{" "}
            {language === "en"
              ? "All rights reserved. This is an independent immigration consultancy and not affiliated with UK Home Office."
              : "保留所有权利。这是一家独立的移民咨询公司，与英国内政部无关联。"}
          </p>
        </div>
      </div>
    </footer>
  )
}
