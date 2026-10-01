/**
 * Content Security & Moderation Utilities
 * Validates product listings against prohibited content policy
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ProhibitedKeywords {
  [category: string]: string[];
}

// List of prohibited keywords and patterns for each category
const prohibitedKeywordsByCategory: ProhibitedKeywords = {
  drogas_sustancias: [
    "marihuana",
    "cannabis",
    "cocaína",
    "cocaina",
    "crack",
    "heroína",
    "heroina",
    "metanfetamina",
    "metanfetamin",
    "éxtasis",
    "extasis",
    "mdma",
    "lsd",
    "fentanilo",
    "fentanilo",
    "ketamina",
    "ketamin",
    "pcp",
    "anfetamina",
    "setas alucinógenas",
    "setas alucinogenas",
    "droga",
    "drogas",
  ],
  armas_municiones: [
    "pistola",
    "revolver",
    "rifle",
    "fusil",
    "escopeta",
    "metralleta",
    "ametralladora",
    "arma",
    "armas",
    "munición",
    "municion",
    "bala",
    "balas",
    "granada",
    "explosivo",
    "explosivos",
    "detonador",
    "dinamita",
    "c4",
    "tnt",
  ],
  productos_robados: [
    "robado",
    "robados",
    "hurto",
    "hurtos",
    "procedencia ilícita",
    "procedencia ilicita",
    "origen dudoso",
    "sin factura",
    "sin papeles",
    "clandestino",
  ],
  documentos_falsificados: [
    "cédula falsa",
    "cedula falsa",
    "pasaporte falso",
    "licencia falsa",
    "título falso",
    "titulo falso",
    "documento falso",
    "falsificado",
    "falsificados",
    "réplica",
    "replica",
    "imitación",
    "imitacion",
  ],
  fraude_estafas: [
    "estafa",
    "fraude",
    "timador",
    "timadores",
    "ponzi",
    "pirámide",
    "piramide",
    "dinero falso",
    "dinero fácil",
    "dinero facil",
    "gana dinero rápido",
    "gana dinero rapido",
    "sistema de pagos falso",
  ],
  servicios_ilegales: [
    "sexo",
    "sexual",
    "acompañante",
    "acompañante",
    "escort",
    "masaje erótico",
    "masaje erotico",
    "trata de personas",
    "tráfico de personas",
    "trafico de personas",
  ],
  malware_archivos_peligrosos: [
    "virus",
    "malware",
    "ransomware",
    "spyware",
    "troyano",
    "gusano",
    "keylogger",
    "código malicioso",
    "codigo malicioso",
    "archivo ejecutable peligroso",
  ],
  contenido_sexual_menores: [
    "menor",
    "menores",
    "niño",
    "niña",
    "niños",
    "porno",
    "pornografía",
    "pornografia",
    "abuso infantil",
    "explotación infantil",
    "explotacion infantil",
  ],
};

/**
 * Sanitize text to remove potential XSS vectors and malicious content
 */
export function sanitizeText(text: string): string {
  if (!text) return "";

  return text
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Normalize text for comparison (lowercase, remove accents, etc.)
 */
export function normalizeText(text: string): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove accents
}

/**
 * Check if text contains prohibited keywords
 */
export function containsProhibitedKeywords(
  text: string,
  category?: string,
): {
  found: boolean;
  category?: string;
  keywords?: string[];
} {
  const normalized = normalizeText(text);

  const categoriesToCheck = category ? [category] : Object.keys(prohibitedKeywordsByCategory);

  for (const cat of categoriesToCheck) {
    const keywords = prohibitedKeywordsByCategory[cat] || [];
    const foundKeywords: string[] = [];

    for (const keyword of keywords) {
      // Use word boundaries to match whole words
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      if (regex.test(normalized)) {
        foundKeywords.push(keyword);
      }
    }

    if (foundKeywords.length > 0) {
      return {
        found: true,
        category: cat,
        keywords: foundKeywords,
      };
    }
  }

  return { found: false };
}

/**
 * Validate product title against prohibited content
 */
export function validateProductTitle(title: string): ValidationResult {
  const errors: string[] = [];

  // Minimum length
  if (!title || title.trim().length < 3) {
    errors.push("El título debe tener al menos 3 caracteres");
  }

  // Maximum length
  if (title.length > 120) {
    errors.push("El título no puede exceder 120 caracteres");
  }

  // Check for prohibited keywords
  const prohibited = containsProhibitedKeywords(title);
  if (prohibited.found) {
    errors.push(`El título contiene palabras prohibidas (categoría: ${prohibited.category})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate product description against prohibited content
 */
export function validateProductDescription(description: string): ValidationResult {
  const errors: string[] = [];

  // Minimum length
  if (!description || description.trim().length < 10) {
    errors.push("La descripción debe tener al menos 10 caracteres");
  }

  // Maximum length
  if (description.length > 2000) {
    errors.push("La descripción no puede exceder 2000 caracteres");
  }

  // Check for prohibited keywords
  const prohibited = containsProhibitedKeywords(description);
  if (prohibited.found) {
    errors.push(`La descripción contiene palabras prohibidas (categoría: ${prohibited.category})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete product before publishing
 */
export function validateProductForPublishing(product: {
  titulo: string;
  descripcion: string;
  categoria_id?: string;
  imagenes?: unknown[];
}): ValidationResult {
  const errors: string[] = [];

  // Validate title
  const titleValidation = validateProductTitle(product.titulo);
  errors.push(...titleValidation.errors);

  // Validate description
  const descValidation = validateProductDescription(product.descripcion);
  errors.push(...descValidation.errors);

  // Check for images
  if (!product.imagenes || product.imagenes.length === 0) {
    errors.push("Debe agregar al menos una imagen");
  }

  // Check category is selected
  if (!product.categoria_id) {
    errors.push("Debe seleccionar una categoría");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get user-friendly message for prohibited content
 */
export function getProhibitedContentMessage(): string {
  return `Tu publicación ha sido rechazada por incumplimiento de nuestras políticas de seguridad. 
  
Se prohíben publicaciones que contengan:
  • Drogas, sustancias ilegales y controladas
  • Armas, municiones o explosivos
  • Productos robados o de procedencia ilícita
  • Documentos falsificados
  • Fraudes o estafas
  • Servicios ilegales
  • Archivos maliciosos o código dañino
  • Cualquier contenido que viole la legislación ecuatoriana

Por favor, revisa tu publicación e intenta de nuevo.`;
}

/**
 * Validate file before upload
 */
export function validateFileForUpload(file: File): ValidationResult {
  const errors: string[] = [];

  // Allowed MIME types
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Tipo de archivo no permitido: ${file.type}. Solo JPG, PNG y WebP son permitidos.`);
  }

  // Max file size: 5MB
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(
      `Archivo muy grande. Máximo: 5MB, tu archivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    );
  }

  // Dangerous file extensions to block
  const dangerousExtensions = [
    "exe",
    "bat",
    "cmd",
    "com",
    "pif",
    "scr",
    "vbs",
    "js",
    "jar",
    "zip",
    "rar",
    "7z",
    "tar",
    "gz",
    "iso",
    "dmg",
    "app",
    "deb",
    "rpm",
    "apk",
    "dll",
    "sys",
    "bin",
  ];

  const fileExt = file.name.split(".").pop()?.toLowerCase();
  if (fileExt && dangerousExtensions.includes(fileExt)) {
    errors.push(`Extensión de archivo no permitida: ${fileExt}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
