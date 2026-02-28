export default function TerminosPage() {
  return (
    <section className="max-w-3xl space-y-4">
      <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3">
        Terminos de uso
      </h2>
      <p className="text-sm text-muted-foreground">
        La informacion presentada en este portal se ofrece con fines de transparencia ciudadana y analisis.
      </p>
      <p className="text-sm text-muted-foreground">
        Los datos provienen de Guatecompras OCDS y pueden contener cambios o correcciones publicados por la fuente.
      </p>
      <p className="text-sm text-muted-foreground">
        Este portal no sustituye publicaciones oficiales ni procesos administrativos. Verifica siempre en la fuente oficial
        antes de tomar decisiones legales, financieras o contractuales.
      </p>
    </section>
  );
}
