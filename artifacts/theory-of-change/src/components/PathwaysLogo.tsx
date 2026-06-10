interface PathwaysLogoProps {
  className?: string;
  size?: number;
}

export function PathwaysLogo({ className = "", size }: PathwaysLogoProps) {
  const grad = "pw-grad";
  const glow = "pw-glow";
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
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#818cf8" />
          <stop offset="55%"  stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <radialGradient id={glow} cx="78%" cy="20%" r="55%">
          <stop offset="0%"   stopColor="#a5b4fc" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* background */}
      <rect width="100" height="100" rx="22" fill={`url(#${grad})`} />
      <rect width="100" height="100" rx="22" fill={`url(#${glow})`} />

      {/* path trail — soft, slightly wider */}
      <path
        d="M 20 75 C 30 60 44 54 50 44 C 56 34 66 25 80 18"
        stroke="white"
        strokeWidth="5"
        fill="none"
        strokeOpacity="0.22"
        strokeLinecap="round"
      />

      {/* start node — small, translucent */}
      <circle cx="20" cy="75" r="7"  fill="white" fillOpacity="0.78" />

      {/* mid node — medium */}
      <circle cx="50" cy="44" r="9"  fill="white" fillOpacity="0.90" />

      {/* end node — largest, full white with subtle inner glow */}
      <circle cx="80" cy="18" r="11.5" fill="white" />
      <circle cx="80" cy="18" r="7"    fill={`url(#${grad})`} fillOpacity="0.35" />
    </svg>
  );
}
