import type {MetadataRoute} from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/account"],
    },
    sitemap: "https://jobs.affan.tech/sitemap.xml",
  };
}
