import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PathwaysLogo } from "../../PathwaysLogo";

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 5500),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ clipPath: "circle(0% at 50% 50%)" }}
      animate={{ clipPath: "circle(150% at 50% 50%)" }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/pathways-scene2.png)" }}
      />
      {/* Deep overlay so logo/text pop */}
      <div className="absolute inset-0" style={{ background: "rgba(10,6,40,0.72)" }} />

      {/* Logo */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <PathwaysLogo size={180} />
      </motion.div>

      {/* Name */}
      <motion.h1
        className="relative z-10 text-[6vw] font-black mt-[3vh] tracking-tighter text-white"
        initial={{ opacity: 0, y: 24 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.8 }}
      >
        Pathways.
      </motion.h1>

      <motion.p
        className="relative z-10 text-[2.2vw] text-white/80 mt-[1.5vh] font-semibold tracking-wide"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
      >
        One platform. Built for the full complexity of change.
      </motion.p>

      {/* Feature pills */}
      <motion.div
        className="relative z-10 flex flex-wrap gap-[1vw] justify-center mt-[3vh] max-w-[60vw]"
        initial={{ opacity: 0, y: 16 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        {["Programme Design", "Indicator Tracking", "GIS Mapping", "Systems Analysis"].map((label) => (
          <span
            key={label}
            className="text-[1.3vw] font-bold px-[1.4vw] py-[0.8vh] rounded-full"
            style={{ background: "rgba(99,102,241,0.28)", border: "1px solid rgba(129,140,248,0.45)", color: "#c7d2fe" }}
          >
            {label}
          </span>
        ))}
      </motion.div>

      <motion.p
        className="relative z-10 text-[1.8vw] text-indigo-300 mt-[2.5vh] font-semibold tracking-wide"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
      >
        Connected, finally.
      </motion.p>
    </motion.div>
  );
}
