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
  server: {
    host: true,
    allowedHosts: [".replit.dev", ".repl.co", "localhost", "127.0.0.1"],
  },
  vite: {
    server: {
      allowedHosts: [".replit.dev", ".repl.co", "localhost", "127.0.0.1"],
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
