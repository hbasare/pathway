import { motion } from "framer-motion";

const lines = [
  { text: "Four tabs open.", size: "3.4vw" },
  { text: "Three email threads.", size: "3.4vw" },
  { text: "Two tools that don't talk to each other.", size: "2.8vw" },
  { text: "One donor waiting on an answer", size: "2.6vw" },
  { text: "you already know — somewhere.", size: "2.6vw" },
];

export function Scene1() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(12px)" }}
      transition={{ duration: 1 }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/pathways-scene1.png)" }}
      />
      {/* Left-weighted gradient for text legibility */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(95deg, rgba(4,3,18,0.93) 38%, rgba(4,3,18,0.50) 100%)" }}
      />

      <div className="relative z-10 ml-[6vw] max-w-[52vw]">
        {lines.map((line, i) => (
          <motion.p
            key={i}
            className="font-black text-white leading-snug"
            style={{ fontSize: line.size, marginBottom: "0.6vh" }}
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 + i * 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {line.text}
          </motion.p>
        ))}

        <motion.p
          className="text-[2.0vw] font-medium mt-[2.5vh] text-white/75 max-w-[46vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 4.5 }}
        >
          You're not disorganized. You're just working with systems that were never built for this work.
        </motion.p>
        <motion.p
          className="text-[2.2vw] font-bold mt-[2vh]"
          style={{ color: "#a5b4fc" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 6.5 }}
        >
          There's a better way.
        </motion.p>
      </div>
    </motion.div>
  );
}
