type EventName =
  | "tour_form_submit"
  | "phone_click"
  | "booking_click"
  | "booking_modal_open"
  | "booking_open_in_tab"
  | "tuition_contact_click"
  | "hero_cta_primary"
  | "hero_cta_pearly"
  | "hero_cta_outline";

declare global {
  interface Window { gtag?: (...args: any[]) => void; }
}

export function track(event: EventName, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}
