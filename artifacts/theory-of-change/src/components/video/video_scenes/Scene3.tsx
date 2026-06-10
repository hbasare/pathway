import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 3000),
      setTimeout(() => setPhase(3), 6000),
      setTimeout(() => setPhase(4), 9000),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-between px-[10vw]"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[40vw] z-10">
        <motion.h2
          className="text-[3.5vw] font-bold text-white leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          Build visual logic maps...
        </motion.h2>
        <motion.p
          className="text-[1.8vw] text-indigo-300 mt-4"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          Replace messy diagrams with a living, connected Theory of Change.
        </motion.p>
      </div>

      <div className="w-[40vw] h-[60vh] relative">
        {/* Animated Logic Map */}
        {[
          { x: 0, y: 50 },
          { x: 40, y: 20 },
          { x: 40, y: 80 },
          { x: 80, y: 50 },
        ].map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-[8vw] h-[8vw] bg-indigo-600/30 border border-indigo-400/50 rounded-2xl flex items-center justify-center backdrop-blur-sm"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, y: '-50%' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{ type: "spring", delay: i * 0.2 + 0.5 }}
          >
            <div className="w-1/2 h-[4px] bg-indigo-300/50 rounded-full" />
          </motion.div>
        ))}

        {/* Connecting Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10">
          <motion.path
            d="M 10% 50% L 40% 20% M 10% 50% L 40% 80% M 48% 20% L 80% 50% M 48% 80% L 80% 50%"
            stroke="#6366f1"
            strokeWidth="3"
            strokeDasharray="10 10"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={phase >= 2 ? { pathLength: 1, opacity: 0.6 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </svg>
      </div>
    </motion.div>
  );
}
