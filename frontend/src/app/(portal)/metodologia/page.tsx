export default function MetodologiaPage() {
  return (
    <section className="max-w-3xl space-y-4">
      <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3">
        Metodologia y fuentes de datos
      </h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Fuente: Guatecompras OCDS (DGAE, Ministerio de Finanzas Publicas).</li>
        <li>Cobertura actual: comprador municipal configurado para este portal.</li>
        <li>Actualizacion: segun disponibilidad/publicacion mensual en la fuente.</li>
        <li>Limitaciones: puede haber rezagos, correcciones o cambios en datos de origen.</li>
      </ul>
    </section>
  );
}
