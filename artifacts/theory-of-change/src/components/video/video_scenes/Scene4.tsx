import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 5000),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1.2 }}
    >
      {/* Abstract Doughnut */}
      <div className="relative w-[40vw] h-[40vw] flex items-center justify-center">
        {/* Core Market */}
        <motion.div
          className="absolute w-[20vw] h-[20vw] rounded-full border-4 border-indigo-400 bg-indigo-500/20 backdrop-blur-md flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={phase >= 1 ? { scale: 1 } : { scale: 0 }}
          transition={{ type: "spring", bounce: 0.4 }}
        >
          <span className="text-[2vw] font-bold text-white">Core Market</span>
        </motion.div>

        {/* Supporting Functions */}
        <motion.svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <motion.circle
            cx="50"
            cy="50"
            r="35"
            stroke="#818cf8"
            strokeWidth="8"
            fill="none"
            strokeDasharray="20 10"
            initial={{ pathLength: 0, rotate: -90 }}
            animate={phase >= 2 ? { pathLength: 1, rotate: 0 } : { pathLength: 0, rotate: -90 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        </motion.svg>
      </div>

      <motion.h2
        className="absolute bottom-[15vh] text-[3.5vw] font-bold text-white max-w-[70vw] text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        ...track interventions and leverage points in the M4P doughnut...
      </motion.h2>
    </motion.div>
  );
}
