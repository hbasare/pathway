import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const roles = [
  { title: "Manager — in the capital", desc: "Oversees the full programme. Assigns components. Sees everything." },
  { title: "Field Officer — on the ground", desc: "Updates indicators and maps interventions in real time." },
  { title: "Donor — three time zones away", desc: "Their language. Their role. Their view of what matters." },
];

export function Scene5() {
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
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-top"
        style={{ backgroundImage: "url(/images/pathways-scene5.png)" }}
      />
      {/* Right-weighted gradient */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(260deg, rgba(4,3,18,0.94) 40%, rgba(4,3,18,0.42) 100%)" }}
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
          Multi-User Collaboration
        </motion.p>

        <motion.h2
          className="text-[2.9vw] font-black text-white leading-tight mb-[2vh]"
          initial={{ opacity: 0, x: 24 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Everyone at the<br />same table.
        </motion.h2>

        <motion.p
          className="text-[1.6vw] text-white/65 mb-[2vh] leading-snug"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          No more translating between versions of the truth.
        </motion.p>

        {/* Role cards */}
        <div className="flex flex-col gap-[1.2vh]">
          {roles.map((r, i) => (
            <motion.div
              key={r.title}
              className="flex items-start gap-[1vw] rounded-xl px-[1.4vw] py-[1.4vh]"
              style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(129,140,248,0.3)" }}
              initial={{ opacity: 0, x: 30 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
              transition={{ duration: 0.5, delay: 0.25 + i * 0.18 }}
            >
              <div
                className="mt-[0.3vh] w-[0.7vw] h-[0.7vw] rounded-full flex-shrink-0"
                style={{ background: "#6366f1" }}
              />
              <div>
                <p className="text-[1.1vw] font-bold text-white">{r.title}</p>
                <p className="text-[0.95vw] text-white/65">{r.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
