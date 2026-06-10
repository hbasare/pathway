import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 3500),
      setTimeout(() => setPhase(3), 5000),
      setTimeout(() => setPhase(4), 8500),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: "blur(20px)" }}
      transition={{ duration: 1.2 }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Rigid nodes */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-[15vw] h-[8vh] border border-white/20 bg-white/5 rounded-md flex items-center justify-center backdrop-blur-md"
            initial={{ opacity: 0, y: 50 }}
            animate={
              phase >= 1
                ? {
                    opacity: phase >= 2 ? 0.2 : 0.8,
                    y: (i % 2 === 0 ? -1 : 1) * (15 + i * 5) + "vh",
                    x: (i % 3 === 0 ? -1 : 1) * (20 + i * 2) + "vw",
                  }
                : { opacity: 0, y: 50 }
            }
            transition={{ duration: 0.8, delay: i * 0.1, type: "spring" }}
          >
            <div className="w-3/4 h-[2px] bg-white/20 rounded-full" />
          </motion.div>
        ))}
      </div>

      <div className="z-10 text-center max-w-[60vw]">
        <motion.h2
          className="text-[4vw] font-bold tracking-tight text-white drop-shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          Every programme starts with a theory of change...
        </motion.h2>
        
        <motion.p
          className="text-[2.5vw] text-[#a5b4fc] mt-[4vh] font-medium"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          ...but too often, our market system analyses get locked in static PDFs.
        </motion.p>
      </div>
    </motion.div>
  );
}
