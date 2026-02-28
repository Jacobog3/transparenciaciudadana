/**
 * Spanish labels for API column names (tenders + awards).
 */
export const TENDER_COLUMN_LABELS: Record<string, string> = {
  ocid: "OCID",
  nog: "NOG",
  buyer_name: "Comprador",
  title: "Título",
  date_published: "Fecha publicación",
  procurement_method_details: "Modalidad",
  number_of_tenderers: "Nº oferentes",
  tender_status: "Estado",
  tender_status_details: "Detalle estado",
  month: "Mes",
};

export const AWARD_COLUMN_LABELS: Record<string, string> = {
  ocid: "OCID",
  nog: "NOG",
  buyer_name: "Comprador",
  title: "Título",
  award_id: "ID adjudicación",
  award_date: "Fecha adjudicación",
  amount: "Monto (Q)",
  currency: "Moneda",
  supplier_name: "Proveedor",
  supplier_id: "ID proveedor",
  month: "Mes",
};

export function getTenderColumnLabel(key: string): string {
  return TENDER_COLUMN_LABELS[key] ?? key;
}

export function getAwardColumnLabel(key: string): string {
  return AWARD_COLUMN_LABELS[key] ?? key;
}
