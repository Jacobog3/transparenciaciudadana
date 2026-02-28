"use client";

const GA_ADS_ID = process.env.NEXT_PUBLIC_GA_ADS_ID ?? "";
const ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GA_ADS_CONVERSION_LABEL ?? "";

function gtagFn() {
  if (typeof window === "undefined") return null;
  return (window as Window & { gtag?: (...args: unknown[]) => void }).gtag ?? null;
}

export function trackAdsConversion(eventName = "conversion_contact") {
  if (!GA_ADS_ID.startsWith("AW-") || !ADS_CONVERSION_LABEL) return;
  const gtag = gtagFn();
  if (!gtag) return;

  gtag("event", "conversion", {
    send_to: `${GA_ADS_ID}/${ADS_CONVERSION_LABEL}`,
    event_callback: () => undefined,
    event_name: eventName,
  });
}
