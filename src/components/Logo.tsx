/** Logo do app: bloco de notas com caneta (mesmo desenho do favicon em src/app/icon.svg) */
export function Logo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Gerenciador de Tarefas"
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#D946EF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-bg)" />
      <rect x="14" y="13" width="28" height="38" rx="5" fill="#fff" />
      <rect x="19" y="9" width="3" height="8" rx="1.5" fill="#fff" stroke="#8B5CF6" strokeWidth="1.5" />
      <rect x="26.5" y="9" width="3" height="8" rx="1.5" fill="#fff" stroke="#9D55F3" strokeWidth="1.5" />
      <rect x="34" y="9" width="3" height="8" rx="1.5" fill="#fff" stroke="#AE4FF0" strokeWidth="1.5" />
      <path d="M20 25h16M20 32h16M20 39h9" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" />
      <g transform="rotate(40 44 36)">
        <path d="M40.5 18h7v22l-3.5 6-3.5-6z" fill="#1E1B4B" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M40.5 23.5h7" stroke="#fff" strokeWidth="2" />
        <path d="M42.4 43.2 44 46l1.6-2.8z" fill="#F0ABFC" />
      </g>
    </svg>
  );
}
