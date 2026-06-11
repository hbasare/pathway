import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const bullets = [
  "A theory of change shouldn't live in a PDF.",
  "Build it as a living canvas.",
  "Connect activities to outputs. Track outcomes as they happen.",
  "Visible, linked, and always up to date.",
];

export function Scene3() {
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
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 1 }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/pathways-scene3.png)" }}
      />
      {/* Right-weighted gradient — content sits on the right */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(260deg, rgba(4,3,18,0.94) 42%, rgba(4,3,18,0.40) 100%)" }}
      />

      <div className="relative z-10 ml-auto mr-[5vw] max-w-[50vw]">
        {/* Label */}
        <motion.p
          className="text-[1.1vw] font-bold uppercase tracking-widest mb-[2vh]"
          style={{ color: "#818cf8" }}
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          Programme Design
        </motion.p>

        {bullets.map((b, i) => (
          <motion.p
            key={i}
            className={`font-bold text-white leading-snug ${i === 0 ? "text-[3vw] mb-[1.5vh]" : "text-[2.0vw] mb-[1vh] text-white/80"}`}
            initial={{ opacity: 0, x: 28 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 28 }}
            transition={{ duration: 0.55, delay: 0.1 + i * 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {i > 0 && <span className="text-indigo-400 mr-2">→</span>}{b}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
}
