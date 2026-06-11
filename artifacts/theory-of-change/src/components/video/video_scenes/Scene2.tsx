import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PathwaysLogo } from "../../PathwaysLogo";

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 4000),
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
        className="relative z-10 text-[5.5vw] font-black mt-[3vh] tracking-tighter text-white"
        initial={{ opacity: 0, y: 24 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.8 }}
      >
        Introducing Pathways.
      </motion.h1>

      {/* Tagline */}
      <motion.p
        className="relative z-10 text-[1.9vw] text-indigo-200 mt-[2vh] max-w-[56vw] text-center font-medium leading-snug"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.25 }}
      >
        Programme design. Indicator measurement. GIS mapping. Systems change — all in one place.
      </motion.p>
    </motion.div>
  );
}
