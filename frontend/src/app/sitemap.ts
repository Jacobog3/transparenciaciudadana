import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

const STATIC_ROUTES = [
  "/",
  "/observacion",
  "/modalidad",
  "/competencia-montos",
  "/datos",
  "/privacidad",
  "/terminos",
  "/metodologia",
];

const MUNICIPALITY_SLUGS = ["antigua"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [];

  for (const route of STATIC_ROUTES) {
    urls.push({
      url: `${SITE_URL}${route}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: route === "/" ? 1 : 0.8,
    });
  }

  for (const slug of MUNICIPALITY_SLUGS) {
    for (const route of STATIC_ROUTES) {
      const suffix = route === "/" ? "" : route;
      urls.push({
        url: `${SITE_URL}/${slug}${suffix}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: route === "/" ? 0.9 : 0.7,
      });
    }
  }

  return urls;
}
