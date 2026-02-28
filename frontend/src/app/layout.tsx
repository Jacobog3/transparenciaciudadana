import type { Metadata } from "next";
import { Suspense } from "react";
import { DM_Sans } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { CookieConsent } from "@/components/cookie-consent";
import { MUNICIPALITY_FULL, MUNICIPALITY_NAME, SITE_LOGO_PATH, SITE_URL } from "@/lib/brand";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const googleAdSenseClient = process.env.NEXT_PUBLIC_GA_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `Transparencia Ciudadana — ${MUNICIPALITY_NAME}`,
  description: `Portal de transparencia ciudadana de ${MUNICIPALITY_FULL}. Contratación pública con datos abiertos de Guatecompras OCDS.`,
  icons: { icon: SITE_LOGO_PATH },
  applicationName: "Transparencia Ciudadana",
  keywords: [
    "transparencia",
    "contratacion publica",
    "guatecompras",
    "OCDS",
    MUNICIPALITY_NAME,
  ],
  robots: {
    index: true,
    follow: true,
  },
  verification: googleSiteVerification
    ? { google: googleSiteVerification }
    : undefined,
  other: googleAdSenseClient
    ? { "google-adsense-account": googleAdSenseClient }
    : undefined,
  openGraph: {
    title: "Transparencia Ciudadana",
    description: `Portal de transparencia de contratación pública para ${MUNICIPALITY_NAME}. Datos abiertos Guatecompras OCDS.`,
    url: SITE_URL,
    siteName: "Transparencia Ciudadana",
    locale: "es_GT",
    type: "website",
    images: [
      {
        url: SITE_LOGO_PATH,
        alt: "Transparencia Ciudadana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Transparencia Ciudadana — ${MUNICIPALITY_NAME}`,
    description: `Portal de transparencia de contratación pública para ${MUNICIPALITY_NAME}.`,
    images: [SITE_LOGO_PATH],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Transparencia Ciudadana",
    url: SITE_URL,
    publisher: {
      "@type": "Organization",
      name: "Transparencia Ciudadana",
      url: SITE_URL,
      logo: `${SITE_URL}${SITE_LOGO_PATH}`,
    },
  };

  return (
    <html lang="es" className={dmSans.variable}>
      <body className="min-h-screen font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <CookieConsent />
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
