declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: { url: string; parentElement: HTMLElement }) => void;
    };
  }
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function buildCalendlyUrl(baseUrl: string): string {
  const current = new URLSearchParams(window.location.search);
  const pairs = UTM_KEYS.map((key) => [key, current.get(key)] as const).filter(
    (pair): pair is [string, string] => !!pair[1],
  );
  if (pairs.length === 0) return baseUrl;
  const params = new URLSearchParams(pairs);
  return `${baseUrl}?${params.toString()}`;
}

const WIDGET_SRC = "https://assets.calendly.com/assets/external/widget.js";
let widgetLoadPromise: Promise<void> | null = null;

export function loadCalendlyScript(): Promise<void> {
  if (window.Calendly) return Promise.resolve();
  if (widgetLoadPromise) return widgetLoadPromise;
  widgetLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Calendly widget script")));
      return;
    }
    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Calendly widget script"));
    document.body.appendChild(script);
  });
  return widgetLoadPromise;
}

export async function mountInlineWidget(container: HTMLElement, url: string): Promise<void> {
  container.innerHTML = "";
  const widget = document.createElement("div");
  widget.className = "calendly-inline-widget";
  widget.setAttribute("data-url", url);
  widget.style.minWidth = "280px";
  widget.style.height = "630px";
  container.appendChild(widget);
  await loadCalendlyScript();
  window.Calendly?.initInlineWidget({ url, parentElement: widget });
}
