export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "惜池集团 Xichi Group",
    alternateName: "Xichi Group",
    url: "https://xichigroup.com.cn",
    description:
      "惜池集团提供专业的英国移民和签证服务，包括创业移民、全球人才签证(GTV)、技术工作签证等。AI智能评估，专家一对一咨询。",
    email: "info@xichigroup.com.cn",
    sameAs: [],
    knowsAbout: [
      "UK Immigration",
      "Global Talent Visa",
      "英国移民",
      "全球人才签证",
      "创业移民",
    ],
    serviceArea: {
      "@type": "Country",
      name: "United Kingdom",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "惜池集团 Xichi Group",
    alternateName: "Xichi Group",
    url: "https://xichigroup.com.cn",
    description:
      "惜池集团提供专业的英国移民和签证服务，AI智能评估，专家一对一咨询。",
    inLanguage: ["zh-CN", "en"],
    publisher: {
      "@type": "Organization",
      name: "惜池集团 Xichi Group",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function ProfessionalServiceJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "惜池集团 Xichi Group",
    url: "https://xichigroup.com.cn",
    description:
      "专业英国移民和签证服务，包括全球人才签证(GTV)评估、申请材料准备和文案撰写。",
    priceRange: "$$",
    areaServed: {
      "@type": "Country",
      name: "United Kingdom",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "移民服务",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "GTV全球人才签证评估",
            description: "AI智能评估全球人才签证申请资格",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "签证文案撰写",
            description: "专业撰写签证申请文案和推荐信",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "移民咨询",
            description: "一对一专家移民咨询服务",
          },
        },
      ],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
