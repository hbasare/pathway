import { motion } from "framer-motion";

function Logo({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <linearGradient id="lg-c" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <radialGradient id="rg-c" cx="78%" cy="20%" r="55%">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#lg-c)" />
      <rect width="100" height="100" rx="22" fill="url(#rg-c)" />
      <path d="M 20 75 C 30 60 44 54 50 44 C 56 34 66 25 80 18" stroke="white" strokeWidth="5" fill="none" strokeOpacity="0.22" strokeLinecap="round" />
      <circle cx="20" cy="75" r="7" fill="white" fillOpacity="0.78" />
      <circle cx="50" cy="44" r="9" fill="white" fillOpacity="0.90" />
      <circle cx="80" cy="18" r="11.5" fill="white" />
      <circle cx="80" cy="18" r="7" fill="url(#lg-c)" fillOpacity="0.35" />
    </svg>
  );
}

export function SunriseInversion() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #fdf6ec 0%, #fde8d0 20%, #fbc4c4 45%, #e8b4e8 65%, #c4b5fd 85%, #a5b4fc 100%)",
      }}
    >
      {/* Soft texture rings */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "70vw", height: "70vw",
          background: "radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%,-55%)",
        }}
      />

      {/* Subtle horizon line */}
      <motion.div
        className="absolute left-0 right-0"
        style={{ bottom: "30%", height: "1px", background: "rgba(99,102,241,0.15)" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, delay: 0.3 }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <Logo size={96} />
        </motion.div>

        <motion.h1
          className="text-7xl font-black tracking-tighter mb-2"
          style={{ color: "#1e1b4b" }}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        >
          Pathways
        </motion.h1>

        <motion.p
          className="text-2xl font-medium mb-10"
          style={{ color: "#4338ca" }}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.55 }}
        >
          Map your impact.
        </motion.p>

        <motion.button
          className="px-10 py-4 rounded-full text-white text-lg font-bold shadow-xl"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4338ca)",
            boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
          }}
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
