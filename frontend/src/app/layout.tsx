import type { Metadata } from "next";
import { Suspense } from "react";
import { DM_Sans } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { CookieConsent } from "@/components/cookie-consent";
import { MUNICIPALITY_FULL, MUNICIPALITY_NAME, SITE_LOGO_PATH } from "@/lib/brand";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://transparenciaciudadana.org"),
  title: `Transparencia Ciudadana — ${MUNICIPALITY_NAME}`,
  description: `Portal de transparencia ciudadana de ${MUNICIPALITY_FULL}. Contratación pública con datos abiertos de Guatecompras OCDS.`,
  icons: { icon: SITE_LOGO_PATH },
  openGraph: {
    title: "Transparencia Ciudadana",
    description: `Portal de transparencia de contratación pública para ${MUNICIPALITY_NAME}. Datos abiertos Guatecompras OCDS.`,
    url: "https://transparenciaciudadana.org",
    siteName: "Transparencia Ciudadana",
    locale: "es_GT",
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
  return (
    <html lang="es" className={dmSans.variable}>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <CookieConsent />
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
