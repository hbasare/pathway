const icons = [
  {
    id: "A",
    name: "Pathway Nodes",
    desc: "Journey from inputs to impact — three growing nodes on a curved path",
    svg: (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <linearGradient id="gA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#gA)" />
        <path d="M20 75 C32 60 45 52 50 44 C55 36 66 26 80 18"
          stroke="white" strokeWidth="4" fill="none" strokeOpacity="0.3" strokeLinecap="round" />
        <circle cx="20" cy="75" r="7"  fill="white" fillOpacity="0.85" />
        <circle cx="50" cy="44" r="9"  fill="white" fillOpacity="0.93" />
        <circle cx="80" cy="18" r="11" fill="white" />
      </svg>
    ),
  },
  {
    id: "B",
    name: "Systems Web",
    desc: "Interconnected nodes — market actors, supporting functions, systemic links",
    svg: (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <linearGradient id="gB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#gB)" />
        {/* edges */}
        {[
          [50,50, 50,18],[50,50, 82,34],[50,50, 82,66],
          [50,50, 50,82],[50,50, 18,66],[50,50, 18,34],
          [50,18, 82,34],[82,34, 82,66],[82,66, 50,82],
          [50,82, 18,66],[18,66, 18,34],[18,34, 50,18],
        ].map(([x1,y1,x2,y2],i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="white" strokeWidth="1.8" strokeOpacity="0.3" />
        ))}
        {/* outer nodes */}
        {[[50,18],[82,34],[82,66],[50,82],[18,66],[18,34]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="5.5" fill="white" fillOpacity="0.7" />
        ))}
        {/* centre */}
        <circle cx="50" cy="50" r="9" fill="white" />
      </svg>
    ),
  },
  {
    id: "C",
    name: "M4P Doughnut",
    desc: "Three concentric rings — rules, supporting functions, core market exchange",
    svg: (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <linearGradient id="gC" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#gC)" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="7"  strokeOpacity="0.25" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="white" strokeWidth="8"  strokeOpacity="0.45" />
        <circle cx="50" cy="50" r="16" fill="none" stroke="white" strokeWidth="9"  strokeOpacity="0.7" />
        <circle cx="50" cy="50" r="6"  fill="white" />
      </svg>
    ),
  },
  {
    id: "D",
    name: "Impact Chain",
    desc: "Linear ToC logic: input → activity → output → outcome → impact",
    svg: (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <linearGradient id="gD" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#gD)" />
        {/* chain of diamonds growing left to right */}
        {[
          { cx: 16, r: 4.5 },
          { cx: 31, r: 5.5 },
          { cx: 48, r: 7 },
          { cx: 67, r: 8.5 },
          { cx: 84, r: 4 },
        ].map((d, i, arr) => (
          <g key={i}>
            {i < arr.length - 1 && (
              <line x1={d.cx + d.r} y1="50" x2={arr[i+1].cx - arr[i+1].r} y2="50"
                stroke="white" strokeWidth="2" strokeOpacity="0.4" />
            )}
            <polygon
              points={`${d.cx},${50-d.r} ${d.cx+d.r},50 ${d.cx},${50+d.r} ${d.cx-d.r},50`}
              fill="white"
              fillOpacity={0.4 + i * 0.13}
            />
          </g>
        ))}
        {/* arrowhead */}
        <polygon points="84,44 92,50 84,56" fill="white" fillOpacity="0.9" />
      </svg>
    ),
  },
  {
    id: "E",
    name: "Compass",
    desc: "Navigation and direction — guiding interventions toward systems change",
    svg: (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <linearGradient id="gE" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#gE)" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.3" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.3"
          strokeDasharray="4 6" />
        {/* N/S/E/W ticks */}
        {[0,90,180,270].map(deg => {
          const rad = (deg - 90) * Math.PI / 180;
          return <line key={deg}
            x1={50 + 28*Math.cos(rad)} y1={50 + 28*Math.sin(rad)}
            x2={50 + 35*Math.cos(rad)} y2={50 + 35*Math.sin(rad)}
            stroke="white" strokeWidth="3" strokeOpacity="0.6" strokeLinecap="round" />;
        })}
        {/* needle — north (up-right) white, south (down-left) dim */}
        <polygon points="50,18 54,52 50,48 46,52" fill="white" />
        <polygon points="50,82 46,48 50,52 54,48" fill="white" fillOpacity="0.35" />
        <circle cx="50" cy="50" r="4.5" fill="white" />
      </svg>
    ),
  },
  {
    id: "F",
    name: "Branching Paths",
    desc: "Diverging interventions from a common root — theory of change logic tree",
    svg: (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <linearGradient id="gF" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#gF)" />
        {/* trunk */}
        <line x1="50" y1="82" x2="50" y2="55" stroke="white" strokeWidth="5" strokeOpacity="0.7" strokeLinecap="round"/>
        {/* level-1 branches */}
        <line x1="50" y1="55" x2="28" y2="38" stroke="white" strokeWidth="3.5" strokeOpacity="0.65" strokeLinecap="round"/>
        <line x1="50" y1="55" x2="72" y2="38" stroke="white" strokeWidth="3.5" strokeOpacity="0.65" strokeLinecap="round"/>
        {/* level-2 branches left */}
        <line x1="28" y1="38" x2="18" y2="22" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round"/>
        <line x1="28" y1="38" x2="38" y2="22" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round"/>
        {/* level-2 branches right */}
        <line x1="72" y1="38" x2="62" y2="22" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round"/>
        <line x1="72" y1="38" x2="82" y2="22" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round"/>
        {/* leaf nodes */}
        {[[18,22],[38,22],[62,22],[82,22]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="5.5" fill="white" fillOpacity="0.85" />
        ))}
        {/* branch nodes */}
        <circle cx="28" cy="38" r="5" fill="white" fillOpacity="0.7" />
        <circle cx="72" cy="38" r="5" fill="white" fillOpacity="0.7" />
        {/* root */}
        <circle cx="50" cy="82" r="6.5" fill="white" />
      </svg>
    ),
  },
];

export function IconShowcase() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Pathways — Icon Options</h1>
          <p className="text-sm text-slate-500">Pick the concept that best represents Theory of Change / M4P / Systems Change</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {icons.map(icon => (
            <div key={icon.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-4 hover:shadow-md transition-shadow"
            >
              {/* label */}
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Option {icon.id}</span>
              </div>

              {/* icon at three sizes */}
              <div className="flex items-end gap-4">
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm">{icon.svg}</div>
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">{icon.svg}</div>
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md">{icon.svg}</div>
              </div>

              {/* name + description */}
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">{icon.name}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{icon.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Each icon shown at 32 px · 48 px · 64 px — the sizes used in sidebar, login, and favicon
        </p>
      </div>
    </div>
  );
}
