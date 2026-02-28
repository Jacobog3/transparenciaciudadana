export const CONSENT_STORAGE_KEY = "tc_cookie_consent_v1";
export const CONSENT_ACCEPTED = "accepted";
export const CONSENT_REJECTED = "rejected";
export const CONSENT_CHANGED_EVENT = "tc-consent-changed";

export type ConsentStatus = typeof CONSENT_ACCEPTED | typeof CONSENT_REJECTED | null;

export function readConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  if (value === CONSENT_ACCEPTED || value === CONSENT_REJECTED) return value;
  return null;
}

export function writeConsentStatus(status: Exclude<ConsentStatus, null>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

export function clearConsentStatus(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}
