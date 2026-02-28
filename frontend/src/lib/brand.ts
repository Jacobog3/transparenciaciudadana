export const MUNICIPALITY_NAME =
  process.env.NEXT_PUBLIC_MUNICIPALITY_NAME || "Municipalidad de Antigua Guatemala";

export const MUNICIPALITY_SHORT_NAME =
  process.env.NEXT_PUBLIC_MUNICIPALITY_SHORT_NAME || "Antigua Guatemala";

export const MUNICIPALITY_REGION =
  process.env.NEXT_PUBLIC_MUNICIPALITY_REGION || "Sacatepéquez";

export const MUNICIPALITY_TAGLINE =
  process.env.NEXT_PUBLIC_MUNICIPALITY_TAGLINE || "Contratación pública municipal";

export const MUNICIPALITY_ACCENT_COLOR =
  process.env.NEXT_PUBLIC_MUNICIPALITY_ACCENT_COLOR || "hsl(var(--primary))";

export const SITE_LOGO_PATH =
  process.env.NEXT_PUBLIC_SITE_LOGO_PATH || "/logo.png";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://transparenciaciudadana.org";

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contacto@transparenciaciudadana.org";

const defaultMunicipalityLogoLightPath = MUNICIPALITY_SHORT_NAME.toLowerCase().includes("antigua")
  ? "/municipalities/antigua/logo-oficial.png"
  : "";

// Backward-compatible generic logo path (legacy)
export const MUNICIPALITY_LOGO_PATH =
  process.env.NEXT_PUBLIC_MUNICIPALITY_LOGO_PATH || "";

// Variant to use over light backgrounds (preferred in current header)
export const MUNICIPALITY_LOGO_LIGHT_PATH =
  process.env.NEXT_PUBLIC_MUNICIPALITY_LOGO_LIGHT_PATH || defaultMunicipalityLogoLightPath;

// Variant to use over dark/colored backgrounds (e.g. white logo)
export const MUNICIPALITY_LOGO_DARK_PATH =
  process.env.NEXT_PUBLIC_MUNICIPALITY_LOGO_DARK_PATH || MUNICIPALITY_LOGO_PATH;

export const MUNICIPALITY_FULL = MUNICIPALITY_REGION
  ? `${MUNICIPALITY_NAME} (${MUNICIPALITY_REGION})`
  : MUNICIPALITY_NAME;
