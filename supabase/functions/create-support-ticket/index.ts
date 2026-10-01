import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const allowedCategories = new Set([
  "problema_tecnico",
  "cuenta",
  "inicio_sesion",
  "pagos",
  "funcionalidad",
  "reportar_error",
  "otro",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sanitizeText = (value: unknown): string => {
  if (typeof value !== "string") return "";

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
};

const validateSupportInput = (payload: Record<string, unknown>) => {
  const name = sanitizeText(payload.name);
  const email = sanitizeText(payload.email).toLowerCase();
  const subject = sanitizeText(payload.subject);
  const description = sanitizeText(payload.description);
  const category = sanitizeText(payload.category);

  const errors: string[] = [];

  if (!name || name.length < 2) errors.push("El nombre es obligatorio.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("El correo electrónico no es válido.");
  }
  if (!category || !allowedCategories.has(category)) {
    errors.push("La categoría seleccionada no es válida.");
  }
  if (!subject || subject.length < 6 || subject.length > 180) {
    errors.push("El asunto debe tener entre 6 y 180 caracteres.");
  }
  if (!description || description.length < 20 || description.length > 5000) {
    errors.push("La descripción debe tener entre 20 y 5000 caracteres.");
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
      user_id: typeof payload.user_id === "string" ? payload.user_id : null,
    },
  };
};

const sendResendEmail = async ({
  to,
  from,
  subject,
  html,
  text,
}: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}) => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email error: ${body.slice(0, 250)}`);
  }

  return response.json();
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatSupportHtml = (ticket: {
  ticket_number: number | null;
  name: string;
  email: string;
  category: string;
  subject: string;
  description: string;
  created_at: string;
  user_id: string | null;
}) => {
  const categoryLabel = ticket.category;
  const date = new Date(ticket.created_at).toLocaleString("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:680px;margin:0 auto;">
      <h2 style="margin:0 0 16px;color:#0f172a;">Nuevo ticket de soporte técnico</h2>
      <p style="margin:0 0 16px;">Se recibió una nueva solicitud desde la aplicación.</p>
      <table role="presentation" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <tr style="background:#f8fafc;"><td style="font-weight:700;width:180px;">Usuario</td><td>${escapeHtml(ticket.name)}</td></tr>
        <tr><td style="font-weight:700;">Correo</td><td>${escapeHtml(ticket.email)}</td></tr>
        <tr style="background:#f8fafc;"><td style="font-weight:700;">Categoría</td><td>${escapeHtml(categoryLabel)}</td></tr>
        <tr><td style="font-weight:700;">Asunto</td><td>${escapeHtml(ticket.subject)}</td></tr>
        <tr style="background:#f8fafc;"><td style="font-weight:700;">Fecha y hora</td><td>${escapeHtml(date)}</td></tr>
        <tr><td style="font-weight:700;">ID de usuario</td><td>${escapeHtml(ticket.user_id ?? "No disponible")}</td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff;">
        <p style="font-weight:700;margin:0 0 8px;">Descripción:</p>
        <p style="margin:0;white-space:pre-wrap;">${escapeHtml(ticket.description)}</p>
      </div>
      <p style="margin-top:18px;color:#475569;">Ticket #: ${ticket.ticket_number ?? "N/A"}</p>
    </div>
  `;
};

const formatConfirmationHtml = (ticketNumber: number | null, receivedAt: string) => {
  const date = new Date(receivedAt).toLocaleString("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:0 auto;">
      <h2 style="margin:0 0 16px;color:#0f172a;">Hemos recibido tu solicitud de soporte</h2>
      <p style="margin:0 0 12px;">Gracias por contactarnos. Hemos recibido tu solicitud y el equipo de soporte la revisará en breve.</p>
      <p style="margin:0 0 12px;">Fecha de recepción: ${escapeHtml(date)}</p>
      <p style="margin:0 0 12px;">Ticket #: ${ticketNumber ?? "N/A"}</p>
      <p style="margin:0; color:#475569;">No responderemos a este correo con información sensible. Nuestro equipo se pondrá en contacto contigo si necesita más detalles.</p>
    </div>
  `;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const validation = validateSupportInput(payload);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ ok: false, error: validation.errors[0], message: "Validación fallida." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing Supabase config",
          message: "No pudimos registrar tu solicitud.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authenticatedEmail = userData.user.email?.trim().toLowerCase();
    if (!authenticatedEmail) {
      return new Response(JSON.stringify({ ok: false, error: "ACCOUNT_EMAIL_REQUIRED" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isActive, error: activeUserError } = await supabase.rpc("is_current_user_active");
    if (activeUserError || isActive !== true) {
      return new Response(JSON.stringify({ ok: false, error: "ACCOUNT_BLOCKED" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = validation.normalized;
    const adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { count: recentTickets, error: rateLimitError } = await adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userData.user.id)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString());

    if (rateLimitError) {
      return new Response(JSON.stringify({ ok: false, error: "RATE_LIMIT_CHECK_FAILED" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((recentTickets ?? 0) > 0) {
      return new Response(JSON.stringify({ ok: false, error: "TOO_MANY_REQUESTS" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ticket, error: insertError } = await adminClient
      .from("support_tickets")
      .insert({
        user_id: userData.user.id,
        name: normalized.name,
        email: authenticatedEmail,
        category: normalized.category,
        subject: normalized.subject,
        description: normalized.description,
        status: "open",
      })
      .select("id, ticket_number, user_id, name, email, category, subject, description, created_at")
      .single();

    if (insertError || !ticket) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "INSERT_FAILED",
          message: "No pudimos registrar tu solicitud.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supportEmail = Deno.env.get("SUPPORT_EMAIL");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || supportEmail || "";
    const ticketNumber = Number(ticket.ticket_number ?? 0) || null;
    const supportText = `Nuevo ticket de soporte técnico\n\nUsuario: ${normalized.name}\nCorreo: ${normalized.email}\nCategoría: ${normalized.category}\nAsunto: ${normalized.subject}\n\nDescripción:\n${normalized.description}\n\nFecha y hora: ${new Date(ticket.created_at).toISOString()}\nID de usuario: ${userData.user.id}`;

    let emailSent = false;

    try {
      if (supportEmail && fromEmail) {
        await sendResendEmail({
          to: supportEmail,
          from: fromEmail,
          subject: "Nuevo ticket de soporte técnico",
          html: formatSupportHtml({
            ticket_number: ticketNumber,
            name: normalized.name,
            email: normalized.email,
            category: normalized.category,
            subject: normalized.subject,
            description: normalized.description,
            created_at: ticket.created_at,
            user_id: userData.user.id,
          }),
          text: supportText,
        });

        await sendResendEmail({
          to: authenticatedEmail,
          from: fromEmail,
          subject: "Hemos recibido tu solicitud de soporte",
          html: formatConfirmationHtml(ticketNumber, ticket.created_at),
          text: `Hemos recibido tu solicitud de soporte.\n\nFecha: ${new Date(ticket.created_at).toISOString()}\nTicket: ${ticketNumber ?? "N/A"}`,
        });

        emailSent = true;
      }
    } catch (error) {
      console.error("Support email notification failed", error);
      emailSent = false;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        ticket_number: ticketNumber,
        email_sent: emailSent,
        message: emailSent
          ? "Solicitud enviada correctamente."
          : "Tu solicitud fue registrada, pero no pudimos enviar la notificación por correo. Nuestro equipo podrá revisarla.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("create-support-ticket failed", message);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "UNKNOWN_ERROR",
        message: "No pudimos registrar tu solicitud. Inténtalo nuevamente.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
