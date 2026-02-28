import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Analytics } from "@/components/analytics";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://transparenciaciudadana.org"),
  title: "Transparencia Ciudadana — Antigua Guatemala",
  description: "Portal de transparencia ciudadana de la Municipalidad de Antigua Guatemala. Contratación pública con datos abiertos de Guatecompras OCDS.",
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "Transparencia Ciudadana",
    description: "Portal de transparencia de contratación pública. Datos abiertos Guatecompras OCDS.",
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
        <Analytics />
      </body>
    </html>
  );
}
