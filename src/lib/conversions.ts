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

// Google Ads detects the conversion via URL trigger on the linked Google tag, so no
// send_to call is needed here — this script only emits the GA4 event for analytics.
export function conversionScript(type: ConversionType): string {
  const cfg = CONVERSIONS[type];
  return (
    `(function(){function fire(){if(typeof gtag!=='function'){return setTimeout(fire,200);}` +
    `gtag('event','${cfg.ga4EventName}',{value:${cfg.value},currency:'${cfg.currency}'});}fire();})();`
  );
}

export type { ConversionType };
