export default function PrivacidadPage() {
  return (
    <section className="max-w-3xl space-y-4">
      <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3">
        Politica de privacidad
      </h2>
      <p className="text-sm text-muted-foreground">
        Este portal utiliza datos publicos de Guatecompras OCDS y puede usar cookies de medicion
        para Google Analytics y Google Ads si el usuario lo autoriza.
      </p>
      <p className="text-sm text-muted-foreground">
        No se solicita registro de usuarios ni se almacenan datos personales sensibles desde formularios
        en este sitio. Las metricas de trafico se usan para mejorar rendimiento, contenido y acceso.
      </p>
      <p className="text-sm text-muted-foreground">
        Puedes cambiar tu consentimiento de cookies borrando datos del navegador y recargando la pagina.
      </p>
    </section>
  );
}
