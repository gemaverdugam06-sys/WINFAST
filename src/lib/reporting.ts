/**
 * Reporting and Moderation System Utilities
 */

export type ReportType = "producto" | "usuario" | "reseña";

export type ReportReason =
  | "drogas"
  | "armas"
  | "explosivos"
  | "robado"
  | "falsificado"
  | "fraude"
  | "ilegal"
  | "malware"
  | "inapropiado"
  | "otro";

export interface ReportInput {
  reportero_id: string;
  tipo: ReportType;
  objeto_id: string;
  razon: ReportReason;
  descripcion?: string;
}

type ReportSupabaseClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => {
      select: (field: string) => {
        single: () => Promise<{
          data?: { id: string } | null;
          error?: { message?: string } | null;
        }>;
      };
    };
  };
};

export async function submitReport(
  supabase: ReportSupabaseClient,
  report: ReportInput,
): Promise<{ success: boolean; error?: string; reportId?: string }> {
  try {
    if (!report.objeto_id || !report.razon) {
      return { success: false, error: "Faltan campos requeridos" };
    }

    const { data, error } = await supabase
      .from("reportes")
      .insert({
        reportero_id: report.reportero_id,
        tipo: report.tipo,
        objeto_id: report.objeto_id,
        razon: report.razon,
        descripcion: report.descripcion || null,
        estado: "pendiente",
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, reportId: data.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export const reportReasons = {
  drogas: "Drogas o sustancias ilegales",
  armas: "Armas, municiones o explosivos",
  explosivos: "Explosivos o materiales peligrosos",
  robado: "Producto robado o de procedencia ilícita",
  falsificado: "Documento o producto falsificado",
  fraude: "Fraude o estafa",
  ilegal: "Actividad o servicio ilegal",
  malware: "Malware o archivo peligroso",
  inapropiado: "Contenido inapropiado",
  otro: "Otro (especificar en descripción)",
};

export function getReasonLabel(reason: ReportReason): string {
  return reportReasons[reason] || "Otro";
}

export function getReportTypeLabel(type: ReportType): string {
  const labels: Record<ReportType, string> = {
    producto: "Publicación",
    usuario: "Usuario",
    reseña: "Reseña",
  };
  return labels[type] || type;
}
