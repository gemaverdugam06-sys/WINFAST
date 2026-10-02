import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [{ title: "Política de privacidad | WINFAST" }],
  }),
  component: Privacidad,
});

function Privacidad() {
  return (
    <main className="min-h-screen bg-[#f5f7f1] text-[#263b2e]">
      <div className="container mx-auto max-w-4xl px-4 py-10 md:py-16">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md border border-[#d4e0d2] bg-white px-4 py-2 text-sm font-semibold text-[#315b43] transition-colors hover:border-[#195e48] hover:bg-[#edf3e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195e48]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>

        <article className="rounded-xl border border-[#dbe4d8] bg-white p-6 shadow-sm md:p-10">
          <header className="mb-8 border-b border-[#dbe4d8] pb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#cbdcbf] bg-[#edf3e8] px-3 py-1 text-xs font-semibold uppercase text-[#315b43]">
              <ShieldCheck className="h-4 w-4" />
              Privacidad
            </div>
            <h1 className="text-3xl font-black text-[#173b2c] md:text-5xl">
              Política de privacidad
            </h1>
          </header>

          <div className="space-y-7 text-base leading-8 text-[#43584a]">
            <section>
              <p>
                WINFAST recopila los datos del usuario, como el correo electrónico y los datos de
                perfil, con la finalidad exclusiva de autenticación, seguridad y gestión de la
                cuenta dentro de la plataforma. Este tratamiento se realiza mediante tecnologías y
                servicios de confianza, incluyendo Supabase y Resend, con la finalidad de garantizar
                la identidad del usuario, proteger la información y facilitar la operación segura de
                la aplicación.
              </p>
            </section>

            <section>
              <p>
                Los datos de usuario no serán vendidos ni compartidos con terceros para fines
                comerciales, de marketing o de explotación de datos. La información se procesa
                únicamente en el marco de la operación de la plataforma y de los servicios técnicos
                necesarios para prestar la experiencia de uso, la seguridad y la autenticación del
                usuario.
              </p>
            </section>

            <section>
              <p>
                El usuario conserva el control sobre su información y puede gestionar su cuenta y
                sus datos dentro de la plataforma conforme a las políticas de seguridad y
                funcionalidad establecidas por WINFAST. Cuando se requiera, la plataforma puede
                utilizar esos datos para confirmar la identidad, prevenir abusos, proteger la
                integridad del sistema y'assurer la continuidad del servicio.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
