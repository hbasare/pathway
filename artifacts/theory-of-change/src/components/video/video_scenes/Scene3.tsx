import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Layers, GitBranch, FolderOpen, Network, Users2, Settings, ArrowRight } from "lucide-react";
import { PathwaysLogo } from "../../PathwaysLogo";

const Sidebar = ({ active }: { active: string }) => {
  const items = [
    { name: "Dashboard", icon: Layers },
    { name: "Theories", icon: GitBranch },
    { name: "Portfolios", icon: FolderOpen },
    { name: "Market System", icon: Network },
    { name: "Users", icon: Users2 },
  ];

  return (
    <div className="w-[18vw] h-full bg-white border-r border-slate-200 flex flex-col pt-[4vh] px-[1.5vw] shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
      <div className="flex items-center gap-[0.8vw] mb-[6vh]">
        <PathwaysLogo size={32} />
        <span className="font-bold text-[1.4vw] text-slate-900 tracking-tight">Pathways</span>
      </div>
      <div className="flex flex-col gap-[1vh]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.name || (active === "Canvas" && item.name === "Theories"); // Canvas is under Theories
          return (
            <div
              key={item.name}
              className={`flex items-center gap-[1vw] px-[1vw] py-[1.2vh] rounded-lg transition-colors ${
                isActive ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-500"
              }`}
            >
              <Icon className="w-[1.2vw] h-[1.2vw]" />
              <span className="text-[1vw]">{item.name}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto mb-[4vh] flex items-center gap-[1vw] px-[1vw] py-[1.2vh] text-slate-400">
        <Settings className="w-[1.2vw] h-[1.2vw]" />
        <span className="text-[1vw]">Settings</span>
      </div>
    </div>
  );
};

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 4500),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const nodes = [
    { label: "Farmer Training", status: "Active" },
    { label: "Improved Practices", status: "Active" },
    { label: "Increased Yields", status: "Draft" },
    { label: "Market Access", status: "Proposed" },
    { label: "Income Growth", status: "Goal" },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-transparent"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Floating App Window */}
      <div className="w-[90vw] h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex border border-white/20">
        <Sidebar active="Canvas" />

        <div className="flex-1 flex flex-col relative bg-slate-50/50">
          {/* Header */}
          <div className="h-[12vh] border-b border-slate-200 bg-white px-[3vw] flex flex-col justify-end">
            <h1 className="text-[1.8vw] font-bold text-slate-900 mb-[1.5vh]">Sustainable Livelihoods Programme</h1>
            <div className="flex gap-[2vw]">
              {["About", "Locations", "Market System", "Business Model", "Canvas", "Notes", "Risk"].map((tab) => (
                <div
                  key={tab}
                  className={`pb-[1vh] text-[0.9vw] font-medium border-b-2 ${
                    tab === "Canvas" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"
                  }`}
                >
                  {tab}
                </div>
              ))}
            </div>
          </div>

          {/* Canvas Area */}
          <div
            className="flex-1 relative overflow-hidden"
            style={{
              backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)",
              backgroundSize: "2vw 2vw",
            }}
          >
            {/* SVG Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#818cf8" />
                </marker>
              </defs>
              {nodes.slice(0, -1).map((_, i) => (
                <motion.path
                  key={`line-${i}`}
                  d={`M ${12 + i * 16}vw 35vh L ${24 + i * 16}vw 35vh`}
                  stroke="#818cf8"
                  strokeWidth="3"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={phase >= 3 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                  transition={{ duration: 1, delay: i * 0.2, ease: "easeInOut" }}
                />
              ))}
            </svg>

            {/* Nodes */}
            <div className="absolute inset-0 flex items-center px-[4vw]">
              {nodes.map((node, i) => (
                <motion.div
                  key={node.label}
                  className="absolute bg-white border-2 border-indigo-200 rounded-xl shadow-sm p-[1.2vw] flex flex-col gap-[1vh] w-[12vw]"
                  style={{ left: `${4 + i * 16}vw`, top: "28vh" }}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={phase >= 2 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25, delay: i * 0.15 }}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-[0.6vw] font-bold uppercase tracking-wider px-[0.6vw] py-[0.2vh] rounded-full ${
                        node.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : node.status === "Goal"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>
                  <h3 className="text-[1vw] font-bold text-slate-800 leading-tight">{node.label}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Voiceover overlay */}
      <motion.div
        className="absolute bottom-[6vh] text-center z-50 pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        <p className="text-[2.2vw] font-bold text-white drop-shadow-lg max-w-[70vw] leading-tight">
          Build living Theories of Change — replace scattered diagrams with connected logic maps
        </p>
      </motion.div>
    </motion.div>
  );
}
