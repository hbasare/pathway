import { motion } from "framer-motion";

function Logo({ size = 80 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <linearGradient id="lg-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <radialGradient id="rg-a" cx="78%" cy="20%" r="55%">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#lg-a)" />
      <rect width="100" height="100" rx="22" fill="url(#rg-a)" />
      <path d="M 20 75 C 30 60 44 54 50 44 C 56 34 66 25 80 18" stroke="white" strokeWidth="5" fill="none" strokeOpacity="0.22" strokeLinecap="round" />
      <circle cx="20" cy="75" r="7" fill="white" fillOpacity="0.78" />
      <circle cx="50" cy="44" r="9" fill="white" fillOpacity="0.90" />
      <circle cx="80" cy="18" r="11.5" fill="white" />
      <circle cx="80" cy="18" r="7" fill="url(#lg-a)" fillOpacity="0.35" />
    </svg>
  );
}

const NODES = [
  { x: "12%", y: "20%", r: 5, delay: 0 },
  { x: "28%", y: "65%", r: 7, delay: 0.3 },
  { x: "42%", y: "30%", r: 6, delay: 0.6 },
  { x: "55%", y: "75%", r: 5, delay: 0.9 },
  { x: "68%", y: "18%", r: 8, delay: 1.1 },
  { x: "78%", y: "55%", r: 5, delay: 1.4 },
  { x: "88%", y: "80%", r: 7, delay: 1.7 },
  { x: "20%", y: "88%", r: 4, delay: 0.5 },
  { x: "90%", y: "30%", r: 5, delay: 1.2 },
  { x: "50%", y: "52%", r: 9, delay: 0.8 },
];

const EDGES = [
  { x1: "12%", y1: "20%", x2: "28%", y2: "65%", delay: 0.2 },
  { x1: "28%", y1: "65%", x2: "42%", y2: "30%", delay: 0.5 },
  { x1: "42%", y1: "30%", x2: "55%", y2: "75%", delay: 0.8 },
  { x1: "55%", y1: "75%", x2: "68%", y2: "18%", delay: 1.0 },
  { x1: "68%", y1: "18%", x2: "78%", y2: "55%", delay: 1.3 },
  { x1: "78%", y1: "55%", x2: "88%", y2: "80%", delay: 1.5 },
  { x1: "12%", y1: "20%", x2: "42%", y2: "30%", delay: 0.4 },
  { x1: "42%", y1: "30%", x2: "68%", y2: "18%", delay: 0.9 },
  { x1: "20%", y1: "88%", x2: "55%", y2: "75%", delay: 1.0 },
  { x1: "50%", y1: "52%", x2: "78%", y2: "55%", delay: 1.2 },
  { x1: "50%", y1: "52%", x2: "42%", y2: "30%", delay: 0.7 },
  { x1: "90%", y1: "30%", x2: "68%", y2: "18%", delay: 1.1 },
];

export function LiveNetwork() {
  return (
    <div className="min-h-screen w-full bg-[#0d0d1a] flex items-center justify-center relative overflow-hidden">
      {/* Animated network — the product's own visual language as backdrop */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.18 }}>
        {EDGES.map((e, i) => (
          <motion.line
            key={i}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke="#6366f1"
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: e.delay, ease: "easeOut" }}
          />
        ))}
        {NODES.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.x} cy={n.y} r={n.r}
            fill="#818cf8"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.7] }}
            transition={{ duration: 0.6, delay: n.delay }}
          />
        ))}
      </svg>

      {/* Glowing center pulse behind content */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "50vw", height: "50vw",
          background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <Logo size={100} />
        </motion.div>

        <motion.h1
          className="text-7xl font-black text-white tracking-tighter mb-2"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        >
          Pathways
        </motion.h1>

        <motion.p
          className="text-2xl font-medium mb-10"
          style={{ color: "#818cf8" }}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.55 }}
        >
          Map your impact.
        </motion.p>

        <motion.button
          className="px-10 py-4 rounded-full text-white text-lg font-bold shadow-lg"
          style={{ background: "#6366f1", boxShadow: "0 0 32px rgba(99,102,241,0.45)" }}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.75 }}
        >
          Start Mapping Today
        </motion.button>
      </div>
    </div>
  );
}
