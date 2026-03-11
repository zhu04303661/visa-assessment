import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "惜池集团 Xichi Group - 专业英国移民服务",
    short_name: "惜池集团",
    description:
      "惜池集团提供专业的英国移民和签证服务，包括创业移民、全球人才签证(GTV)、技术工作签证等。",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a1a2e",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
