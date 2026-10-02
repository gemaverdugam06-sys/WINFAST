export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" role="img">
      <defs>
        <linearGradient id="facilitologo-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#d7f287" />
          <stop offset="58%" stopColor="#a8ce4d" />
          <stop offset="100%" stopColor="#e9af3b" />
        </linearGradient>
      </defs>

      <rect x="4" y="4" width="56" height="56" rx="18" fill="#123f34" />
      <path d="M34 8 18 34h11l-4.8 22L45 28H34l5-20Z" fill="url(#facilitologo-gradient)" />
      <path d="M29 10.5 21 26h8.5L26 39l12.5-17H31l3.5-11.5Z" fill="#ffffff" opacity="0.2" />
    </svg>
  );
}
