import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PathwaysLogo } from "../../PathwaysLogo";

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 5000),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {["EN", "FR", "ES", "PT", "SW"].map((lang, i) => (
          <motion.div
            key={lang}
            className="absolute text-[2.5vw] font-bold text-indigo-400 bg-white/5 border border-indigo-500/30 px-[2vw] py-[1vh] rounded-full backdrop-blur-md"
            initial={{ opacity: 0, scale: 0 }}
            animate={
              phase >= 1
                ? {
                    opacity: 0.8,
                    scale: 1,
                    x: Math.cos((i * Math.PI * 2) / 5) * 25 + "vw",
                    y: Math.sin((i * Math.PI * 2) / 5) * 25 + "vh",
                  }
                : { opacity: 0, scale: 0 }
            }
            transition={{ type: "spring", delay: i * 0.15 }}
          >
            {lang}
          </motion.div>
        ))}
      </div>

      <motion.div
        className="z-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        <h2 className="text-[4vw] font-bold text-white mb-[2vh]">
          ...and collaborate seamlessly.
        </h2>
        <p className="text-[2vw] text-indigo-300">
          Across teams, languages, and continents.
        </p>
      </motion.div>

      {/* Outro Transition / Logo Lockup */}
      <motion.div
        className="absolute inset-0 bg-[#1e1b4b] flex flex-col items-center justify-center z-20"
        initial={{ y: "100%" }}
        animate={phase >= 3 ? { y: 0 } : { y: "100%" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <PathwaysLogo size={150} className="mb-[4vh]" />
        <h1 className="text-[6vw] font-black text-white tracking-tighter">Pathways</h1>
        <p className="text-[2.5vw] text-indigo-300 font-medium">Map your impact.</p>
        <div className="mt-[8vh] px-[3vw] py-[1.5vh] bg-indigo-600 rounded-full text-white text-[1.5vw] font-bold">
          Start Mapping Today
        </div>
      </motion.div>
    </motion.div>
  );
}
