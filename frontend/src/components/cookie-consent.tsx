"use client";

import { useEffect, useState } from "react";
import {
  CONSENT_ACCEPTED,
  CONSENT_CHANGED_EVENT,
  CONSENT_REJECTED,
  type ConsentStatus,
  readConsentStatus,
  writeConsentStatus,
} from "@/lib/consent";

export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentStatus>(null);

  useEffect(() => {
    const sync = () => setConsent(readConsentStatus());
    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
  }, []);

  if (consent) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-xs text-muted-foreground sm:text-sm">
          Usamos cookies de medicion para Analytics y Ads. Puedes aceptar o rechazar.
          Al continuar sin aceptar, el portal funciona igual.
        </p>
        <div className="flex shrink-0 items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => {
              writeConsentStatus(CONSENT_REJECTED);
              setConsent(CONSENT_REJECTED);
            }}
            className="h-9 rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted w-full sm:w-auto"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => {
              writeConsentStatus(CONSENT_ACCEPTED);
              setConsent(CONSENT_ACCEPTED);
            }}
            className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-95 w-full sm:w-auto"
          >
            Aceptar cookies
          </button>
        </div>
      </div>
    </div>
  );
}
