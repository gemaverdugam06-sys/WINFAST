import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [{ title: "Términos y condiciones | WINFAST" }],
  }),
  component: Terminos,
});

function Terminos() {
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
            <p className="mb-3 text-sm font-semibold uppercase text-[#55803d]">WINFAST</p>
            <h1 className="text-3xl font-black text-[#173b2c] md:text-5xl">
              Términos y condiciones
            </h1>
          </header>

          <div className="space-y-7 text-base leading-8 text-[#43584a]">
            <section>
              <h2 className="mb-3 text-xl font-bold text-[#195e48]">
                1. Declaración de independencia
              </h2>
              <p>
                WINFAST es una plataforma digital independiente y no tiene vínculo, afiliación ni
                relación comercial con redes de recaudación de pagos ni entidades bancarias de
                terceros. La operación de la plataforma se realiza de forma autónoma y sin
                dependencia directa con procesos financieros o entidades ajenas que no formen parte
                del ecosistema oficial de WINFAST.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-[#195e48]">2. Alcance del marketplace</h2>
              <p>
                Se permite la publicación de TODO tipo de productos físicos y digitales, comercio
                minorista y servicios profesionales, técnicos, asesorías y actividades relacionadas
                con la oferta y demanda comercial en Ecuador. WINFAST funciona como catálogo visual
                y punto de encuentro entre compradores y vendedores.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-[#195e48]">3. Restricción estricta</h2>
              <p>
                Queda prohibida única y exclusivamente la publicación de bienes, artículos o
                servicios ILEGALES o que violen las leyes vigentes de la República del Ecuador. Esto
                incluye, sin limitarse a: armas, drogas, sustancias sujetas a control, réplicas
                falsificadas, fraudes, actividades delictivas u otros contenidos que contravengan la
                normativa ecuatoriana aplicable.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-[#195e48]">
                4. Modelo de cobro y pasarela de pago
              </h2>
              <ul className="list-disc space-y-2 pl-6 text-[#43584a]">
                <li>
                  La publicación, navegación y uso general de la plataforma es totalmente gratuito
                  para los usuarios.
                </li>
                <li>
                  WINFAST no cobra comisiones por las ventas entre usuarios. El único servicio de
                  pago disponible dentro de la app es la opción opcional de destacar anuncios para
                  obtener mayor visibilidad.
                </li>
                <li>
                  Los pagos por destacados se procesan de forma segura a través de la pasarela de
                  pagos PAYPHONE.
                </li>
                <li>
                  Estos pagos son finales y no reembolsables una vez prestado el servicio de
                  visibilidad.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-[#195e48]">
                5. Deslinde de responsabilidad
              </h2>
              <p>
                WINFAST actúa únicamente como un catálogo visual y punto de encuentro entre
                compradores y vendedores. La negociación, pago y entrega de los productos o
                servicios anunciados se realiza bajo el exclusivo acuerdo y responsabilidad directa
                entre las partes. WINFAST no interviene en la ejecución, calidad, cumplimiento ni
                entrega de la transacción comercial, salvo en los servicios técnicos y de operación
                que la plataforma disponga de forma explícita.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
