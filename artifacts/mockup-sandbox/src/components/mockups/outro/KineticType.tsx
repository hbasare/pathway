import { motion } from "framer-motion";

function Logo({ size = 52 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <linearGradient id="lg-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <radialGradient id="rg-b" cx="78%" cy="20%" r="55%">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#lg-b)" />
      <rect width="100" height="100" rx="22" fill="url(#rg-b)" />
      <path d="M 20 75 C 30 60 44 54 50 44 C 56 34 66 25 80 18" stroke="white" strokeWidth="5" fill="none" strokeOpacity="0.22" strokeLinecap="round" />
      <circle cx="20" cy="75" r="7" fill="white" fillOpacity="0.78" />
      <circle cx="50" cy="44" r="9" fill="white" fillOpacity="0.90" />
      <circle cx="80" cy="18" r="11.5" fill="white" />
      <circle cx="80" cy="18" r="7" fill="url(#lg-b)" fillOpacity="0.35" />
    </svg>
  );
}

export function KineticType() {
  const letters = ["P","A","T","H","W","A","Y","S"];

  return (
    <div className="min-h-screen w-full bg-[#0a0014] flex items-center justify-center relative overflow-hidden select-none">

      {/* Giant background wordmark — fills the frame */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        aria-hidden
      >
        <motion.div
          className="flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {letters.map((l, i) => (
            <motion.span
              key={i}
              className="font-black leading-none"
              style={{
                fontSize: "clamp(100px, 18vw, 220px)",
                color: "transparent",
                WebkitTextStroke: "1.5px rgba(99,102,241,0.18)",
                letterSpacing: "-0.02em",
                fontFamily: "system-ui, sans-serif",
              }}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
            >
              {l}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* Foreground content — tight, editorial, left-anchored */}
      <div className="relative z-10 w-full max-w-4xl px-16 flex flex-col gap-6">
        <motion.div
          className="flex items-center gap-4"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Logo size={52} />
          <span
            className="text-xl font-semibold tracking-widest uppercase"
            style={{ color: "#818cf8", letterSpacing: "0.22em" }}
          >
            Pathways
          </span>
        </motion.div>

        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.65 }}
        >
          <div className="h-px w-20 mb-5" style={{ background: "rgba(99,102,241,0.5)" }} />
          <p className="text-5xl font-bold text-white leading-tight">
            Map your<br />
            <span style={{ color: "#818cf8" }}>impact.</span>
          </p>
        </motion.div>

        <motion.button
          className="self-start px-8 py-3 rounded-full text-white font-bold text-base"
          style={{ background: "#6366f1" }}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.85 }}
        >
          Start Mapping Today
        </motion.button>
      </div>
    </div>
  );
}
