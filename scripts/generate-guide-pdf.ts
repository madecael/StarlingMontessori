// scripts/generate-guide-pdf.ts
import puppeteer from "puppeteer";
import path from "node:path";

const SOURCE_URL = process.env.GUIDE_SOURCE_URL ?? "http://localhost:4321/guide-pdf-source";
const OUT_PATH = path.resolve(process.cwd(), "public/Starling_Preschool_Decision_Guide.pdf");

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(SOURCE_URL, { waitUntil: "networkidle0" });
  await page.emulateMediaType("print");
  await page.pdf({
    path: OUT_PATH,
    format: "Letter",
    printBackground: true,
    margin: { top: "0.75in", bottom: "0.75in", left: "0.75in", right: "0.75in" },
  });
  await browser.close();
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
