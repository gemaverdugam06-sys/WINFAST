export type SupportCategory =
  | "problema_tecnico"
  | "cuenta"
  | "inicio_sesion"
  | "pagos"
  | "funcionalidad"
  | "reportar_error"
  | "otro";

export interface SupportTicketInput {
  userId?: string | null;
  name: string;
  email: string;
  category: string;
  subject: string;
  description: string;
}

export function sanitizeSupportText(value: string): string {
  if (!value) return "";

  const withoutControls = Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");

  return withoutControls
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/javascript\s*:/gi, " ")
    .replace(/on\w+\s*=\s*['"][^'"]*['"]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateSupportTicketInput(input: SupportTicketInput) {
  const errors: string[] = [];

  const name = sanitizeSupportText(input.name || "");
  const email = sanitizeSupportText(input.email || "").toLowerCase();
  const subject = sanitizeSupportText(input.subject || "");
  const description = sanitizeSupportText(input.description || "");
  const category = sanitizeSupportText(input.category || "");

  if (!name || name.length < 2) {
    errors.push("El nombre es obligatorio.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("El correo electrónico no es válido.");
  }

  if (!category) {
    errors.push("La categoría es obligatoria.");
  }

  if (!subject || subject.length < 6 || subject.length > 180) {
    errors.push("El asunto debe tener entre 6 y 180 caracteres.");
  }

  if (!description || description.length < 20 || description.length > 5000) {
    errors.push("La descripción debe tener entre 20 y 5000 caracteres.");
  }

  const allowedCategories = new Set([
    "problema_tecnico",
    "cuenta",
    "inicio_sesion",
    "pagos",
    "funcionalidad",
    "reportar_error",
    "otro",
  ]);

  if (category && !allowedCategories.has(category)) {
    errors.push("La categoría seleccionada no es válida.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      name,
      email,
      category,
      subject,
      description,
      userId: input.userId ?? null,
    },
  };
}
