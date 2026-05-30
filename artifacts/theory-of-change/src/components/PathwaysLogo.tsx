interface PathwaysLogoProps {
  className?: string;
  size?: number;
}

export function PathwaysLogo({ className = "", size }: PathwaysLogoProps) {
  const id = "pw-grad";
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      aria-label="Pathways logo"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>

      <rect width="100" height="100" rx="22" fill={`url(#${id})`} />

      <path
        d="M 22 76 C 30 62 40 56 50 46 C 60 36 68 28 78 20"
        stroke="white"
        strokeWidth="4.5"
        fill="none"
        strokeOpacity="0.35"
        strokeLinecap="round"
      />

      <circle cx="22" cy="76" r="8" fill="white" fillOpacity="0.9" />
      <circle cx="50" cy="46" r="9" fill="white" fillOpacity="0.95" />
      <circle cx="78" cy="20" r="10" fill="white" />
    </svg>
  );
}
