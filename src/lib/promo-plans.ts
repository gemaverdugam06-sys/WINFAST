export const FEATURED_PLAN_CONFIG = {
  FLASH: {
    key: "FLASH",
    name: "FLASH",
    label: "FLASH",
    price: 1,
    durationDays: 2,
    priority: 5,
    badge: "⚡",
  },
  BASICO: {
    key: "BASICO",
    name: "BÁSICO",
    label: "BÁSICO",
    price: 2,
    durationDays: 5,
    priority: 4,
    badge: "🔵",
  },
  PLUS: {
    key: "PLUS",
    name: "PLUS",
    label: "PLUS",
    price: 3.5,
    durationDays: 10,
    priority: 3,
    badge: "⭐",
  },
  PRO: {
    key: "PRO",
    name: "PRO",
    label: "PRO",
    price: 5.99,
    durationDays: 20,
    priority: 2,
    badge: "🔥",
  },
  MEGA: {
    key: "MEGA",
    name: "MEGA",
    label: "MEGA",
    price: 8.99,
    durationDays: 30,
    priority: 1,
    badge: "👑",
  },
} as const;

export type FeaturedPlanKey = keyof typeof FEATURED_PLAN_CONFIG;

export const BUSINESS_PLANS = [
  { key: "NEGOCIO", name: "PLAN NEGOCIO", price: 4.99 },
  { key: "PROFESIONAL", name: "PLAN PROFESIONAL", price: 9.99 },
  { key: "EMPRESA", name: "PLAN EMPRESA", price: 19.99 },
] as const;

export const ADVERTISING_OPTIONS = {
  banner_principal: { name: "Banner principal", price: 39 },
  negocio_destacado: { name: "Negocio destacado", price: 29 },
  categoria: { name: "Publicidad por categoría", price: 24 },
  productos: { name: "Publicidad en productos", price: 22 },
  servicios: { name: "Publicidad en servicios", price: 22 },
} as const;

export const FUTURE_COMMISSION_PERCENT = 0.05;

export const PROMO_PLAN_DAYS: Record<string, number> = Object.fromEntries(
  Object.entries(FEATURED_PLAN_CONFIG).map(([key, plan]) => [key, plan.durationDays]),
) as Record<string, number>;

export function promoEndDate(plan: string, from = new Date()): string {
  const days = PROMO_PLAN_DAYS[plan] ?? 7;
  const end = new Date(from);
  end.setDate(end.getDate() + days);
  return end.toISOString();
}

export function getFeaturedPlan(planKey: string) {
  return FEATURED_PLAN_CONFIG[planKey as FeaturedPlanKey] ?? FEATURED_PLAN_CONFIG.FLASH;
}

export function getFeaturedPriority(planKey: string) {
  return getFeaturedPlan(planKey).priority;
}
