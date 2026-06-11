import { motion } from "framer-motion";

const lines = [
  { text: "Juggling spreadsheets.", size: "3.4vw" },
  { text: "A separate GIS tool.", size: "3.4vw" },
  { text: "A reporting platform.", size: "3.4vw" },
  { text: "Three email threads —", size: "3.0vw" },
  { text: "all to answer one donor question.", size: "2.8vw" },
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
          className="text-[2.2vw] font-semibold mt-[3vh]"
          style={{ color: "#a5b4fc" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 4.0 }}
        >
          You deserve something better.
        </motion.p>
      </div>
    </motion.div>
  );
}
