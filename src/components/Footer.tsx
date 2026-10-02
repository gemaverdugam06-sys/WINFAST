import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-[#d6e1d3] bg-[#eaf1e3] text-[#33483a]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-bold text-[#173b2c]">WINFAST</p>
            <p className="text-sm text-[#607264]">
              © 2026 WINFAST. Plataforma digital independiente.
            </p>
          </div>

          <nav aria-label="Enlaces legales" className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              to="/terminos"
              className="rounded-sm text-[#315b43] underline-offset-4 transition-colors hover:text-[#a0442f] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195e48]"
            >
              Términos y condiciones
            </Link>
            <span className="text-[#9aa99a]">|</span>
            <Link
              to="/privacidad"
              className="rounded-sm text-[#315b43] underline-offset-4 transition-colors hover:text-[#a0442f] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195e48]"
            >
              Política de privacidad
            </Link>
            <span className="text-[#9aa99a]">|</span>
            <Link
              to="/politicas-seguridad"
              className="rounded-sm text-[#315b43] underline-offset-4 transition-colors hover:text-[#a0442f] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195e48]"
            >
              Políticas de seguridad
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
