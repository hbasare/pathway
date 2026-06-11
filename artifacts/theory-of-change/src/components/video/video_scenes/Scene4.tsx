import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const points = [
  { label: "Indicator Tracking", body: "Monitor programme KPIs in real time." },
  { label: "GIS Mapping", body: "Visualise interventions geographically." },
  { label: "M4P Systems Analysis", body: "Analyse core markets, functions & rules." },
  { label: "When asked what's working —", body: "You don't guess. You show them." },
];

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 1 }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/pathways-scene4.png)" }}
      />
      {/* Overlay — heavier on left */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(95deg, rgba(4,3,18,0.94) 40%, rgba(4,3,18,0.48) 100%)" }}
      />

      <div className="relative z-10 ml-[6vw] max-w-[48vw]">
        {/* Label */}
        <motion.p
          className="text-[1.1vw] font-bold uppercase tracking-widest mb-[2.5vh]"
          style={{ color: "#818cf8" }}
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          Measurement &amp; Spatial Analysis
        </motion.p>

        {/* Headline */}
        <motion.h2
          className="text-[3.0vw] font-black text-white leading-tight mb-[1.5vh]"
          initial={{ opacity: 0, x: -24 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Numbers without context<br />are just numbers.
        </motion.h2>

        <motion.p
          className="text-[1.7vw] text-white/70 mb-[2.5vh] leading-snug max-w-[44vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Pathways connects your indicators to your geography — and your geography to your market system analysis.
        </motion.p>

        {/* Bullet cards */}
        <div className="grid grid-cols-2 gap-[1.5vw]">
          {points.map((p, i) => (
            <motion.div
              key={p.label}
              className="rounded-xl px-[1.4vw] py-[1.6vh]"
              style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(129,140,248,0.3)" }}
              initial={{ opacity: 0, y: 18 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.18 }}
            >
              <p className="text-[1.1vw] font-bold text-indigo-300 mb-[0.4vh]">{p.label}</p>
              <p className="text-[0.95vw] text-white/75">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
