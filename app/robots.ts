import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/debug/", "/profile/"],
      },
    ],
    sitemap: "https://xichigroup.com.cn/sitemap.xml",
  }
}
