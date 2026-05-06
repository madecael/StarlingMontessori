// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://starlingmontessorischool.com",
  output: "static",
  adapter: node({ mode: "standalone" }),
  // Dev server only — production runs via the Node adapter and doesn't read these.
  // Allow any host so Replit's preview URLs (which can be multi-level subdomains
  // like *.spock.replit.dev, *.kirk.replit.dev, etc.) reach the dev server.
  server: {
    host: true,
    allowedHosts: true,
  },
  vite: {
    server: {
      allowedHosts: true,
    },
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      filter: (p) => !p.includes("/api/"),
    }),
  ],
  redirects: {
    "/About.html": "/about",
    "/Programs.html": "/programs/toddler",
    "/Toddler-Program.html": "/programs/toddler",
    "/Primary-Program.html": "/programs/primary",
    "/Admissions.html": "/admissions",
    "/Tuition.html": "/tuition",
    "/Open-House.html": "/open-house",
    "/FAQ.html": "/faq",
    "/Contact.html": "/contact",
    "/Montessori-Education.html": "/about",
    "/Jobs.html": "/contact",
    "/Parent-Resources.html": "/faq",
    "/Staff-Resource.html": "/contact",
  },
});
