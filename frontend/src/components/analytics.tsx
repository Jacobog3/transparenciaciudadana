"use client";

import Script from "next/script";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
const GA_ADS_ID = process.env.NEXT_PUBLIC_GA_ADS_ID ?? "";

const hasAnalytics = GA_MEASUREMENT_ID.startsWith("G-");
const hasAds = GA_ADS_ID.startsWith("AW-");
const scriptId = hasAnalytics ? GA_MEASUREMENT_ID : hasAds ? GA_ADS_ID : "";

export function Analytics() {
  if (!scriptId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${scriptId}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){ dataLayer.push(arguments); }
          gtag('js', new Date());
          ${hasAnalytics ? `gtag('config', '${GA_MEASUREMENT_ID}');` : ""}
          ${hasAds ? `gtag('config', '${GA_ADS_ID}');` : ""}
        `}
      </Script>
    </>
  );
}
