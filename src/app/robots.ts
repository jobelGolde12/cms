import type { MetadataRoute } from "next";

/**
 * This is an internal school-records system containing student/employee
 * personal data. No page should be crawled or indexed by search engines.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
