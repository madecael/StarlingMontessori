import type { CollectionEntry } from "astro:content";

type Settings = CollectionEntry<"settings">["data"];
type ConversionType = "tourBookingToddler" | "tourBookingPrimary" | "contactFormSubmit" | "applicationSubmit";

interface ConversionConfig {
  value: number;
  currency: "USD";
  ga4EventName: string;
}

const CONVERSIONS: Record<ConversionType, ConversionConfig> = {
  tourBookingToddler: { value: 50, currency: "USD", ga4EventName: "tour_booking_toddler" },
  tourBookingPrimary: { value: 80, currency: "USD", ga4EventName: "tour_booking_primary" },
  contactFormSubmit: { value: 20, currency: "USD", ga4EventName: "contact_form_submit" },
  applicationSubmit: { value: 300, currency: "USD", ga4EventName: "application_submit" },
};

/**
 * Returns a `<script>` snippet that fires both a GA4 event and a Google Ads conversion
 * (when the Ads ID + label are configured). Designed to be inlined on confirmation pages
 * with `<script set:html={...}>`. Page-load firing is more reliable for Google Ads.
 */
export function conversionScript(type: ConversionType, settings: Settings): string {
  const cfg = CONVERSIONS[type];
  const adsId = settings.googleAdsConversionId;
  const label = settings.googleAdsConversionLabels?.[type];
  const lines: string[] = [];

  // GA4 event always fires (gtag config already initialized in BaseHead).
  // Use timeout to ensure gtag is loaded before firing.
  lines.push(
    `(function(){function fire(){if(typeof gtag!=='function'){return setTimeout(fire,200);}` +
    `gtag('event','${cfg.ga4EventName}',{value:${cfg.value},currency:'${cfg.currency}'});`
  );

  // Google Ads conversion only fires if both ID and label are present.
  if (adsId && label) {
    lines.push(
      `gtag('event','conversion',{send_to:'${adsId}/${label}',value:${cfg.value},currency:'${cfg.currency}'});`
    );
  }

  lines.push(`}fire();})();`);
  return lines.join("");
}

export type { ConversionType };
