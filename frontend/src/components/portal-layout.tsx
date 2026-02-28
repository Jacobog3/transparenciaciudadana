"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchDataReference, fetchFilters } from "@/lib/api";
import { useFilterParams } from "@/hooks/use-filter-params";
import { clearConsentStatus } from "@/lib/consent";
import { trackAdsConversion } from "@/lib/tracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CONTACT_EMAIL,
  MUNICIPALITY_ACCENT_COLOR,
  MUNICIPALITY_FULL,
  MUNICIPALITY_LOGO_LIGHT_PATH,
  MUNICIPALITY_SHORT_NAME,
  MUNICIPALITY_TAGLINE,
  SITE_URL,
  SITE_LOGO_PATH,
} from "@/lib/brand";

const NAV = [
  { href: "/", label: "General" },
  { href: "/observacion", label: "Observación ciudadana" },
  { href: "/modalidad", label: "Por modalidad" },
  { href: "/competencia-montos", label: "Competencia y montos" },
  { href: "/datos", label: "Datos" },
] as const;

const RESERVED_FIRST_SEGMENTS = new Set([
  "observacion",
  "modalidad",
  "competencia-montos",
  "datos",
  "privacidad",
  "terminos",
  "metodologia",
]);

function municipalityFromPath(pathname: string): string | null {
  const first = pathname.split("/").filter(Boolean)[0];
  if (!first) return null;
  return RESERVED_FIRST_SEGMENTS.has(first) ? null : first;
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { params, setParams, searchParams } = useFilterParams();
  const [filters, setFilters] = useState<{ months: string[]; years: string[] }>({ months: [], years: [] });
  const [dataRef, setDataRef] = useState<{ last_downloaded?: string; package_date_range?: string }>({});
  const [useRange, setUseRange] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const [navCanScrollLeft, setNavCanScrollLeft] = useState(false);
  const [navCanScrollRight, setNavCanScrollRight] = useState(false);

  useEffect(() => {
    fetchFilters().then((data) => {
      setFilters(data);
      if (data.years.length && !params.years?.length) {
        setParams({ years: data.years });
      }
    });
    fetchDataReference().then(setDataRef);
  }, []);

  useEffect(() => {
    setUseRange(!!(params.from_month || params.to_month));
  }, [params.from_month, params.to_month]);

  useEffect(() => {
    setMobileFiltersOpen(false);
  }, [pathname]);

  const updateNavScrollCue = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setNavCanScrollLeft(el.scrollLeft > 2);
    setNavCanScrollRight(maxScroll - el.scrollLeft > 2);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    updateNavScrollCue();

    const onScroll = () => updateNavScrollCue();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateNavScrollCue);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateNavScrollCue) : null;
    if (ro) ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateNavScrollCue);
      ro?.disconnect();
    };
  }, [updateNavScrollCue, pathname]);

  const fromMonth = params.from_month ?? filters.months[0] ?? "";
  const toMonth = params.to_month ?? filters.months[filters.months.length - 1] ?? "";
  const years = params.years?.length ? params.years : filters.years;
  const activeYearsLabel =
    years.length === 0
      ? "Todos los años"
      : years.length === 1
        ? "1 año seleccionado"
        : `${years.length} años seleccionados`;
  const activeMonthsLabel =
    useRange && fromMonth && toMonth
      ? `${fromMonth} a ${toMonth}`
      : "Todos los meses";
  const municipalityLogoLightPath = MUNICIPALITY_LOGO_LIGHT_PATH || "";
  const municipalitySlug = municipalityFromPath(pathname);
  const navBase = municipalitySlug ? `/${municipalitySlug}` : "";
  const municipalityDisplayShort =
    municipalitySlug && municipalitySlug !== "antigua"
      ? humanizeSlug(municipalitySlug)
      : MUNICIPALITY_SHORT_NAME;
  const municipalityDisplayFull =
    municipalitySlug && municipalitySlug !== "antigua"
      ? municipalityDisplayShort
      : MUNICIPALITY_FULL;
  const pathFor = (suffix: string) => (suffix === "/" ? (navBase || "/") : `${navBase}${suffix}`);
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-primary" />
        <div className="w-1/3 bg-white" />
        <div className="flex-1 bg-primary" />
      </div>

      <header className="shrink-0 border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src={SITE_LOGO_PATH}
                alt="Transparencia Ciudadana"
                width={40}
                height={40}
                className="shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight text-foreground leading-tight">
                  Transparencia Ciudadana
                </h1>
                <p className="mt-0.5 truncate text-sm leading-tight">
                  <span className="font-semibold" style={{ color: MUNICIPALITY_ACCENT_COLOR }}>
                    {municipalityDisplayShort}
                  </span>
                </p>
              </div>
            </div>
            {municipalityLogoLightPath ? (
              <div className="hidden shrink-0 rounded-md border border-border/70 bg-muted/30 p-1.5 sm:block">
                <Image
                  src={municipalityLogoLightPath}
                  alt={`Logo de ${municipalityDisplayShort}`}
                  width={40}
                  height={40}
                  className="h-9 w-9 object-contain"
                />
              </div>
            ) : null}
          </div>

          <div className="relative">
            <nav ref={navRef} className="flex gap-1 -mb-px overflow-x-auto scrollbar-none pr-4">
              {NAV.map(({ href, label }) => {
                const targetPath = pathFor(href);
                const active = pathname === targetPath;
                return (
                  <Link
                    key={href}
                    href={targetPath + (searchParams.toString() ? `?${searchParams.toString()}` : "")}
                    onClick={() => setMobileFiltersOpen(false)}
                    className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            {navCanScrollLeft && (
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card via-card/75 to-transparent md:hidden" />
            )}
            {navCanScrollRight && (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card via-card/75 to-transparent md:hidden" />
            )}
          </div>
        </div>
      </header>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden">
          <button
            aria-label="Cerrar filtros"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-border bg-background px-4 pb-6 pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Filtros</h3>
              <Button variant="outline" size="sm" onClick={() => setMobileFiltersOpen(false)}>
                Listo
              </Button>
            </div>

            <div className="space-y-5">
              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Año(s)</p>
                <div className="grid grid-cols-3 gap-2">
                  {filters.years.map((y) => {
                    const selected = years?.includes(y) ?? false;
                    return (
                      <button
                        key={y}
                        type="button"
                        className={`h-9 rounded-md border text-sm font-medium transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-muted"
                        }`}
                        onClick={() => {
                          const next = selected
                            ? (years ?? []).filter((x) => x !== y)
                            : [...(years ?? []), y];
                          setParams({ years: next.length ? next : filters.years });
                        }}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3 border-t border-border pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useRange}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setUseRange(on);
                      setParams({
                        from_month: on ? filters.months[0] : undefined,
                        to_month: on ? filters.months[filters.months.length - 1] : undefined,
                      });
                    }}
                    className="rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="font-medium text-foreground">Rango de meses</span>
                </label>
                {useRange && filters.months.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
                      <Select
                        value={fromMonth}
                        onChange={(e) => setParams({ from_month: e.target.value })}
                        className="h-10 w-full border-border bg-background text-sm"
                      >
                        {filters.months.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
                      <Select
                        value={toMonth}
                        onChange={(e) => setParams({ to_month: e.target.value })}
                        className="h-10 w-full border-border bg-background text-sm"
                      >
                        {filters.months.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                )}
              </section>

              <div className="flex gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setUseRange(false);
                    setParams({
                      years: filters.years,
                      from_month: undefined,
                      to_month: undefined,
                    });
                  }}
                >
                  Limpiar
                </Button>
                <Button className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 gap-6 flex-col md:flex-row">
        <aside className="hidden md:block w-56 shrink-0 space-y-4">
          <Card className="rounded-md border border-border shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-foreground">
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Año(s)</p>
              <div className="flex flex-wrap gap-2">
                {filters.years.map((y) => {
                  const selected = years?.includes(y) ?? false;
                  return (
                    <Badge
                      key={y}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer font-medium px-3 py-1.5 transition-colors hover:opacity-90"
                      onClick={() => {
                        const next = selected
                          ? (years ?? []).filter((x) => x !== y)
                          : [...(years ?? []), y];
                        setParams({ years: next.length ? next : filters.years });
                      }}
                    >
                      {y}
                    </Badge>
                  );
                })}
              </div>
              <div className="border-t border-border pt-3 space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRange}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setParams({
                        from_month: on ? filters.months[0] : undefined,
                        to_month: on ? filters.months[filters.months.length - 1] : undefined,
                      });
                    }}
                    className="rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="font-medium">Rango de meses</span>
                </label>
                {useRange && filters.months.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground block">Desde</label>
                    <Select
                      value={fromMonth}
                      onChange={(e) => setParams({ from_month: e.target.value })}
                      className="w-full h-9 text-sm border-border bg-background"
                    >
                      {filters.months.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </Select>
                    <label className="text-xs text-muted-foreground block">Hasta</label>
                    <Select
                      value={toMonth}
                      onChange={(e) => setParams({ to_month: e.target.value })}
                      className="w-full h-9 text-sm border-border bg-background"
                    >
                      {filters.months.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {(dataRef.last_downloaded || dataRef.package_date_range) && (
            <Collapsible defaultOpen={false}>
              <Card className="rounded-md border border-border shadow-sm">
                <CollapsibleTrigger className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors">
                  Referencia de los datos
                </CollapsibleTrigger>
                <CollapsibleContent className="text-xs text-muted-foreground space-y-1.5 px-4 pb-3">
                  <p><strong className="text-foreground">Fuente:</strong> Guatecompras OCDS (DGAE).</p>
                  {dataRef.last_downloaded && (
                    <p><strong className="text-foreground">Última descarga:</strong> {dataRef.last_downloaded}</p>
                  )}
                  {dataRef.package_date_range && (
                    <p><strong className="text-foreground">Publicación:</strong> {dataRef.package_date_range}</p>
                  )}
                  <p>Datos: {municipalityDisplayFull}.</p>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </aside>

        <main className="flex-1 min-w-0 w-full space-y-6">
          <div className="md:hidden">
            <Card className="rounded-md border border-border shadow-sm">
              <CardContent className="space-y-3 px-4 pb-3.5 pt-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Filtros activos</p>
                  <p className="break-words text-sm font-medium leading-tight text-foreground">{activeYearsLabel}</p>
                  <p className="break-words text-xs leading-relaxed text-muted-foreground">{activeMonthsLabel}</p>
                </div>
                <div>
                  <Button size="sm" className="h-8 w-full px-3" onClick={() => setMobileFiltersOpen(true)}>
                    Editar filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          {children}
        </main>
      </div>

      <footer className="mt-auto shrink-0 border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-5 md:hidden">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Transparencia Ciudadana</h3>
            <p className="mt-1 text-sm font-medium" style={{ color: MUNICIPALITY_ACCENT_COLOR }}>
              {municipalityDisplayShort}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{MUNICIPALITY_TAGLINE}</p>
          </div>

          <div className="mt-4 divide-y divide-border rounded-md border border-border">
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-foreground">
                Secciones
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border px-3 pb-3 pt-2">
                <ul className="space-y-1.5 text-sm">
                  <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/")}>General</Link></li>
                  <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/observacion")}>Observacion ciudadana</Link></li>
                  <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/modalidad")}>Por modalidad</Link></li>
                  <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/competencia-montos")}>Competencia y montos</Link></li>
                  <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/datos")}>Datos</Link></li>
                </ul>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-foreground">
                Transparencia
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border px-3 pb-3 pt-2">
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <Link className="text-muted-foreground hover:text-foreground" href={pathFor("/metodologia")}>
                      Metodologia y fuente de datos
                    </Link>
                  </li>
                  <li>
                    <a
                      className="text-muted-foreground hover:text-foreground"
                      href="https://ocds.guatecompras.gt/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Guatecompras OCDS
                    </a>
                  </li>
                  <li>
                    <a className="text-muted-foreground hover:text-foreground" href={SITE_URL} target="_blank" rel="noreferrer">
                      Sitio institucional
                    </a>
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-foreground">
                Legal y contacto
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border px-3 pb-3 pt-2">
                <ul className="space-y-1.5 text-sm">
                  <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/privacidad")}>Politica de privacidad</Link></li>
                  <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/terminos")}>Terminos de uso</Link></li>
                  <li>
                    <a
                      className="text-muted-foreground hover:text-foreground"
                      href={`mailto:${CONTACT_EMAIL}`}
                      onClick={() => trackAdsConversion("contact_email_click")}
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={clearConsentStatus}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Preferencias de cookies
                    </button>
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <p>{new Date().getFullYear()} Transparencia Ciudadana.</p>
            {dataRef.last_downloaded && <p>Ultima actualizacion: {dataRef.last_downloaded}</p>}
          </div>
        </div>

        <div className="mx-auto hidden max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 md:grid md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Transparencia Ciudadana</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Portal de seguimiento de contratacion publica municipal con datos abiertos OCDS.
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: MUNICIPALITY_ACCENT_COLOR }}>
              {municipalityDisplayShort}
            </p>
          </div>

          <div className="border-t border-border pt-4 sm:border-0 sm:pt-0">
            <h3 className="text-sm font-semibold text-foreground">Secciones</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/")}>General</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/observacion")}>Observacion ciudadana</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/modalidad")}>Por modalidad</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/competencia-montos")}>Competencia y montos</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/datos")}>Datos</Link></li>
            </ul>
          </div>

          <div className="border-t border-border pt-4 sm:border-0 sm:pt-0">
            <h3 className="text-sm font-semibold text-foreground">Transparencia</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link className="text-muted-foreground hover:text-foreground" href={pathFor("/metodologia")}>
                  Metodologia y fuente de datos
                </Link>
              </li>
              <li>
                <a
                  className="text-muted-foreground hover:text-foreground"
                  href="https://ocds.guatecompras.gt/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Guatecompras OCDS
                </a>
              </li>
              <li>
                <a className="text-muted-foreground hover:text-foreground" href={SITE_URL} target="_blank" rel="noreferrer">
                  Sitio institucional
                </a>
              </li>
            </ul>
          </div>

          <div className="border-t border-border pt-4 sm:border-0 sm:pt-0">
            <h3 className="text-sm font-semibold text-foreground">Legal y contacto</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/privacidad")}>Politica de privacidad</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/terminos")}>Terminos de uso</Link></li>
              <li>
                <a
                  className="text-muted-foreground hover:text-foreground"
                  href={`mailto:${CONTACT_EMAIL}`}
                  onClick={() => trackAdsConversion("contact_email_click")}
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={clearConsentStatus}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Preferencias de cookies
                </button>
              </li>
              {dataRef.last_downloaded && (
                <li className="text-muted-foreground">Ultima actualizacion de datos: {dataRef.last_downloaded}</li>
              )}
            </ul>
          </div>
        </div>

        <div className="hidden border-t border-border md:block">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-8">
            <p>
              {new Date().getFullYear()} Transparencia Ciudadana. {MUNICIPALITY_TAGLINE}.
            </p>
            <p>Datos: {municipalityDisplayFull} · Guatecompras OCDS (DGAE)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
