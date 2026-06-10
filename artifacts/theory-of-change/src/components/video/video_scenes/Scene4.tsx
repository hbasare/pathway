import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Layers, GitBranch, FolderOpen, Network, Users2, Settings } from "lucide-react";
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
          const isActive = active === item.name;
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

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const rulesLabels = ["Land Tenure", "Regulations", "Social Norms", "Finance Policy", "Trade Rules", "Standards"];
  const functionsLabels = ["Extension Services", "Finance", "Infrastructure", "Market Info"];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-transparent"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Floating App Window */}
      <div className="w-[90vw] h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex border border-white/20">
        <Sidebar active="Market System" />

        <div className="flex-1 flex flex-col relative bg-slate-50/50">
          {/* Header */}
          <div className="h-[12vh] border-b border-slate-200 bg-white px-[3vw] flex flex-col justify-end">
            <h1 className="text-[1.8vw] font-bold text-slate-900 mb-[1.5vh]">Market System Analysis</h1>
            <div className="flex gap-[2vw]">
              {["Overview", "Market System", "Actors", "Constraints", "Interventions"].map((tab) => (
                <div
                  key={tab}
                  className={`pb-[1vh] text-[0.9vw] font-medium border-b-2 ${
                    tab === "Market System" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"
                  }`}
                >
                  {tab}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Doughnut Diagram */}
            <div className="flex-1 relative flex items-center justify-center">
              <svg className="w-[45vw] h-[45vw]" viewBox="-100 -100 200 200">
                {/* Outermost Ring (Rules) */}
                <motion.circle
                  r="85"
                  stroke="#e0e7ff"
                  strokeWidth="28"
                  fill="none"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0, opacity: 0, rotate: -90 }}
                  animate={phase >= 4 ? { pathLength: 1, opacity: 1, rotate: 0 } : { pathLength: 0, opacity: 0, rotate: -90 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                {rulesLabels.map((label, i) => {
                  const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
                  return (
                    <motion.text
                      key={label}
                      x={Math.cos(angle) * 85}
                      y={Math.sin(angle) * 85}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[0.6vw] font-bold fill-indigo-400 uppercase tracking-wider"
                      initial={{ opacity: 0 }}
                      animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ delay: 1.5 + i * 0.1 }}
                    >
                      {label}
                    </motion.text>
                  );
                })}

                {/* Middle Ring (Functions) */}
                <motion.circle
                  r="52"
                  stroke="#818cf8"
                  strokeWidth="32"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0, rotate: 90 }}
                  animate={phase >= 3 ? { pathLength: 1, opacity: 1, rotate: 0 } : { pathLength: 0, opacity: 0, rotate: 90 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                {functionsLabels.map((label, i) => {
                  const angle = (i * Math.PI * 2) / 4 - Math.PI / 2;
                  return (
                    <motion.text
                      key={label}
                      x={Math.cos(angle) * 52}
                      y={Math.sin(angle) * 52}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[0.7vw] font-bold fill-white"
                      initial={{ opacity: 0 }}
                      animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ delay: 1.2 + i * 0.1 }}
                    >
                      {label}
                    </motion.text>
                  );
                })}

                {/* Inner Core */}
                <motion.circle
                  r="30"
                  fill="#6366f1"
                  initial={{ scale: 0 }}
                  animate={phase >= 2 ? { scale: 1 } : { scale: 0 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                />
                <motion.text
                  x="0"
                  y="-2"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[0.8vw] font-bold fill-white"
                  initial={{ opacity: 0 }}
                  animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Core Market
                </motion.text>
                <motion.text
                  x="0"
                  y="10"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[0.7vw] font-medium fill-indigo-200"
                  initial={{ opacity: 0 }}
                  animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  Exchange
                </motion.text>
              </svg>
            </div>

            {/* Right Panel List */}
            <div className="w-[22vw] bg-white border-l border-slate-200 p-[2vw] flex flex-col gap-[2vh]">
              <h3 className="text-[1.2vw] font-bold text-slate-800">Elements</h3>
              <div className="flex flex-col gap-[1.5vh]">
                {[...rulesLabels.slice(0, 3), ...functionsLabels.slice(0, 2)].map((item, i) => (
                  <motion.div
                    key={item}
                    className="flex justify-between items-center p-[1vw] bg-slate-50 rounded-lg border border-slate-100"
                    initial={{ opacity: 0, x: 20 }}
                    animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="text-[0.9vw] font-medium text-slate-700">{item}</span>
                    <span className={`text-[0.6vw] font-bold uppercase px-[0.5vw] py-[0.2vh] rounded ${i % 2 === 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {i % 2 === 0 ? "Active" : "Proposed"}
                    </span>
                  </motion.div>
                ))}
              </div>
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
          Map your market systems — track interventions across the M4P doughnut
        </p>
      </motion.div>
    </motion.div>
  );
}
