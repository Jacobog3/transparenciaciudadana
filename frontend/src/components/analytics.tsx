"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  CONSENT_ACCEPTED,
  CONSENT_CHANGED_EVENT,
  type ConsentStatus,
  readConsentStatus,
} from "@/lib/consent";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
const GA_ADS_ID = process.env.NEXT_PUBLIC_GA_ADS_ID ?? "";
const GA_ADSENSE_CLIENT = process.env.NEXT_PUBLIC_GA_ADSENSE_CLIENT ?? "";

const hasAnalytics = GA_MEASUREMENT_ID.startsWith("G-");
const hasAds = GA_ADS_ID.startsWith("AW-");
const hasAdSense = GA_ADSENSE_CLIENT.startsWith("ca-pub-");
const scriptId = hasAnalytics ? GA_MEASUREMENT_ID : hasAds ? GA_ADS_ID : "";
const hasTagScript = Boolean(scriptId);

export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<ConsentStatus>(null);

  useEffect(() => {
    const sync = () => setConsent(readConsentStatus());
    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
  }, []);

  const query = searchParams.toString();
  const fullPath = useMemo(
    () => (query ? `${pathname}?${query}` : pathname),
    [pathname, query],
  );

  useEffect(() => {
    if (!hasAnalytics || consent !== CONSENT_ACCEPTED) return;
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    if (!gtag) return;
    gtag("event", "page_view", { page_path: fullPath });
  }, [consent, fullPath]);

  if ((!hasTagScript && !hasAdSense) || consent !== CONSENT_ACCEPTED) return null;

  return (
    <>
      {hasTagScript && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${scriptId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-config" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){ dataLayer.push(arguments); }
              window.gtag = gtag;
              gtag('js', new Date());
              ${hasAnalytics ? `gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });` : ""}
              ${hasAds ? `gtag('config', '${GA_ADS_ID}');` : ""}
            `}
          </Script>
        </>
      )}
      {hasAdSense && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GA_ADSENSE_CLIENT}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      )}
    </>
  );
}
