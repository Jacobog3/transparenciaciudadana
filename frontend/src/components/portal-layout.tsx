"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchDataReference, fetchFilters } from "@/lib/api";
import { useFilterParams } from "@/hooks/use-filter-params";
import { clearConsentStatus } from "@/lib/consent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

  const fromMonth = params.from_month ?? filters.months[0] ?? "";
  const toMonth = params.to_month ?? filters.months[filters.months.length - 1] ?? "";
  const years = params.years?.length ? params.years : filters.years;
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
              <Image
                src={municipalityLogoLightPath}
                alt={`Logo de ${municipalityDisplayShort}`}
                width={36}
                height={36}
                className="hidden h-9 w-9 shrink-0 object-contain sm:block"
              />
            ) : null}
          </div>

          <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-none">
            {NAV.map(({ href, label }) => {
              const targetPath = pathFor(href);
              const active = pathname === targetPath;
              return (
                <Link
                  key={href}
                  href={targetPath + (searchParams.toString() ? `?${searchParams.toString()}` : "")}
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
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 gap-6 flex-col md:flex-row">
        <aside className="w-full md:w-56 shrink-0 space-y-4">
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
          {children}
        </main>
      </div>

      <footer className="mt-auto shrink-0 border-t border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Transparencia Ciudadana</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Portal de seguimiento de contratacion publica municipal con datos abiertos OCDS.
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: MUNICIPALITY_ACCENT_COLOR }}>
              {municipalityDisplayShort}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Secciones</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/")}>General</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/observacion")}>Observacion ciudadana</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/modalidad")}>Por modalidad</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/competencia-montos")}>Competencia y montos</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/datos")}>Datos</Link></li>
            </ul>
          </div>

          <div>
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

          <div>
            <h3 className="text-sm font-semibold text-foreground">Legal y contacto</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/privacidad")}>Politica de privacidad</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href={pathFor("/terminos")}>Terminos de uso</Link></li>
              <li><a className="text-muted-foreground hover:text-foreground" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
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

        <div className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
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
