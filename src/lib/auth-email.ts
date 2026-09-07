export type SignupEmailStatusInput = {
  hasSession: boolean;
  emailConfirmed: boolean;
};

export function getSignupStatusVariant({ hasSession, emailConfirmed }: SignupEmailStatusInput) {
  if (hasSession && emailConfirmed) return "success";
  if (!hasSession && !emailConfirmed) return "email-verification-required";
  return "warning";
}

export function getSignupStatusMessage({ hasSession, emailConfirmed }: SignupEmailStatusInput) {
  if (hasSession && emailConfirmed) {
    return "Inicio correcto. Ya puedes continuar.";
  }

  if (!hasSession && !emailConfirmed) {
    return "Cuenta creada. Revisa tu correo para confirmar tu dirección y activar tu cuenta.";
  }

  return "Tu cuenta está en proceso de activación.";
}

export async function resendSignupVerificationEmail(
  client: {
    auth: {
      resend?: (options: { type: "signup"; email: string }) => Promise<{ error?: { message?: string } | null }>;
    };
  },
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const resend = client.auth.resend;

  if (!resend) {
    return {
      error: { message: "La autenticación no soporta el reenvío de confirmación por correo." },
    };
  }

  return resend({ type: "signup", email: normalizedEmail });
}
