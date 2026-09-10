import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { normalizeWhatsapp } from "@/lib/whatsapp";

/** Convierte entrada local ecuatoriana a formato E.164 (+593...) para Supabase Auth. */
export function toE164Phone(raw: string): string | null {
  const digits = normalizeWhatsapp(raw);
  if (!digits) return null;
  return `+${digits}`;
}

/** Cuenta verificada cuando confirma correo o teléfono. */
export function isUserVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  return !!(user.email_confirmed_at || user.phone_confirmed_at);
}

export function validateStrongPassword(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[a-z]/.test(password)) return "La contraseña debe incluir una letra minúscula.";
  if (!/[A-Z]/.test(password)) return "La contraseña debe incluir una letra mayúscula.";
  if (!/\d/.test(password)) return "La contraseña debe incluir un número.";
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "La contraseña debe incluir un carácter especial.";
  }
  return null;
}

export async function getUserRole(userId: string): Promise<string | null> {
  if (!userId) return null;

  const { data: isAdmin, error: adminError } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (!adminError && isAdmin) {
    return "admin";
  }

  if (adminError) {
    console.error("Error consultando el rol admin:", adminError);
  }

  return null;
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "admin";
}

/** Envía OTP SMS al teléfono (login o registro). */
export async function sendPhoneOtp(phone: string) {
  return supabase.auth.signInWithOtp({
    phone,
    options: { channel: "sms" },
  });
}

/** Verifica código SMS recibido en el celular. */
export async function verifyPhoneOtp(phone: string, token: string) {
  return supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
}

/** Vincula teléfono a cuenta existente (correo/OAuth) y envía OTP. */
export async function linkPhoneToAccount(phone: string) {
  return supabase.auth.updateUser({ phone });
}

/** Confirma cambio/vinculación de teléfono con OTP. */
export async function verifyPhoneLink(phone: string, token: string) {
  return supabase.auth.verifyOtp({
    phone,
    token,
    type: "phone_change",
  });
}
