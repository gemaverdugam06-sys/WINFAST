import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supportEmail = Deno.env.get("SUPPORT_EMAIL");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || supportEmail;
    const missingConfig = [
      !url && "SUPABASE_URL",
      !anonKey && "SUPABASE_ANON_KEY",
      !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
      !fromEmail && "RESEND_FROM_EMAIL (o SUPPORT_EMAIL)",
    ].filter(Boolean);
    if (missingConfig.length > 0) {
      return jsonResponse({
        error: `Falta configuración de soporte: ${missingConfig.join(", ")}`,
      }, 500);
    }

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: role, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError || !role) return jsonResponse({ error: "Forbidden" }, 403);

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const ticketId = typeof payload.ticket_id === "string" ? payload.ticket_id : "";
    const reply = typeof payload.reply === "string" ? payload.reply.trim() : "";
    if (!ticketId || reply.length < 2 || reply.length > 5000) {
      return jsonResponse({ error: "La respuesta debe tener entre 2 y 5000 caracteres." }, 400);
    }

    const { data: ticket, error: ticketError } = await adminClient
      .from("support_tickets")
      .select("id, ticket_number, email, subject")
      .eq("id", ticketId)
      .maybeSingle();
    if (ticketError || !ticket) return jsonResponse({ error: "Ticket no encontrado" }, 404);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return jsonResponse({ error: "Falta configurar RESEND_API_KEY en Supabase." }, 500);
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [ticket.email],
        subject: `Respuesta de soporte — Ticket #${ticket.ticket_number ?? "N/A"}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937"><h2>Respuesta de soporte WINFAST</h2><p>En respuesta a: <strong>${escapeHtml(ticket.subject)}</strong></p><p style="white-space:pre-wrap">${escapeHtml(reply)}</p><p>Ticket #${ticket.ticket_number ?? "N/A"}</p></div>`,
        text: `Respuesta de soporte WINFAST\n\nEn respuesta a: ${ticket.subject}\n\n${reply}\n\nTicket #${ticket.ticket_number ?? "N/A"}`,
      }),
    });
    if (!emailResponse.ok) {
      const resendError = (await emailResponse.json().catch(() => ({}))) as { message?: string };
      console.error("Resend rejected support reply", {
        status: emailResponse.status,
        message: resendError.message,
      });
      return jsonResponse(
        {
          error: resendError.message || "No se pudo enviar el correo de respuesta.",
        },
        502,
      );
    }

    const { error: updateError } = await adminClient
      .from("support_tickets")
      .update({ response_text: reply, responded_at: new Date().toISOString(), status: "resolved" })
      .eq("id", ticketId);
    if (updateError) return jsonResponse({ error: "Correo enviado, pero no se pudo guardar la respuesta." }, 500);

    return jsonResponse({ ok: true, message: "Respuesta enviada correctamente." });
  } catch (error) {
    console.error("reply-support-ticket failed", error);
    return jsonResponse({ error: "No se pudo procesar la respuesta." }, 500);
  }
});