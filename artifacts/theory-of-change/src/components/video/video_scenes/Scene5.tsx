import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Home, LayoutGrid, FolderGit2, Users, Settings, Plus, Search } from "lucide-react";
import { PathwaysLogo } from "../../PathwaysLogo";

const Sidebar = ({ active }: { active: string }) => {
  const items = [
    { name: "Dashboard", icon: Home },
    { name: "Program Logframe", icon: LayoutGrid },
    { name: "Theories", icon: FolderGit2 },
    { name: "Users", icon: Users },
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

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 4000), // Outro transition
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const theories = [
    { title: "Sustainable Livelihoods", org: "Global NGO", status: "Active", progress: 75, color: "bg-green-500" },
    { title: "Market Access Programme", org: "Regional Govt", status: "In Progress", progress: 40, color: "bg-blue-500" },
    { title: "Systems Change Initiative", org: "Local Partner", status: "Draft", progress: 15, color: "bg-slate-400" },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-transparent overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Floating App Window */}
      <motion.div
        className="w-[90vw] h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex border border-white/20 relative"
        animate={phase >= 3 ? { scale: 0.9, opacity: 0, y: -50 } : { scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "anticipate" }}
      >
        <Sidebar active="Dashboard" />

        <div className="flex-1 flex flex-col relative bg-slate-50/50 p-[3vw]">
          {/* Header & Languages */}
          <div className="flex justify-between items-end mb-[4vh]">
            <div>
              <div className="flex items-center gap-[1vw] mb-[1vh]">
                <h1 className="text-[2.2vw] font-bold text-slate-900 leading-none">My Theories of Change</h1>
                <span className="bg-indigo-100 text-indigo-700 text-[0.8vw] font-bold px-[0.8vw] py-[0.3vh] rounded-full">6 theories</span>
              </div>
              <p className="text-[1vw] text-slate-500">Manage and track your programme impact.</p>
            </div>

            <div className="flex items-center gap-[1.5vw]">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-[1vw] py-[0.8vh]">
                <Search className="w-[1vw] h-[1vw] text-slate-400 mr-[0.5vw]" />
                <span className="text-[0.9vw] text-slate-400">Search theories...</span>
              </div>
              
              <div className="flex gap-[0.5vw]">
                {["EN", "FR", "ES", "PT", "SW"].map((lang, i) => (
                  <div
                    key={lang}
                    className={`w-[2vw] h-[2vw] rounded-full flex items-center justify-center text-[0.7vw] font-bold ${
                      i === 0 ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200"
                    }`}
                  >
                    {lang}
                  </div>
                ))}
              </div>

              <button className="bg-indigo-600 text-white px-[1.5vw] py-[1vh] rounded-lg text-[0.9vw] font-bold flex items-center gap-[0.5vw] shadow-sm">
                <Plus className="w-[1vw] h-[1vw]" /> New Theory
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-3 gap-[2vw]">
            {theories.map((theory, i) => (
              <motion.div
                key={theory.title}
                className="bg-white border border-slate-200 rounded-xl p-[1.5vw] shadow-sm flex flex-col gap-[2vh] group hover:border-indigo-300 transition-colors"
                initial={{ opacity: 0, y: 30 }}
                animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[0.7vw] font-bold uppercase tracking-wider px-[0.6vw] py-[0.2vh] rounded ${
                    theory.status === "Active" ? "bg-green-100 text-green-700" :
                    theory.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {theory.status}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-[1.2vw] font-bold text-slate-900 leading-tight mb-[0.5vh] group-hover:text-indigo-600 transition-colors">{theory.title}</h3>
                  <p className="text-[0.9vw] text-slate-500">{theory.org}</p>
                </div>

                <div className="mt-auto pt-[2vh] border-t border-slate-100">
                  <div className="flex justify-between text-[0.8vw] font-medium text-slate-500 mb-[0.5vh]">
                    <span>Completion</span>
                    <span>{theory.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-[0.6vh] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${theory.color}`}
                      initial={{ width: 0 }}
                      animate={phase >= 2 ? { width: `${theory.progress}%` } : { width: 0 }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Voiceover overlay */}
      <motion.div
        className="absolute bottom-[6vh] text-center z-40 pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 && phase < 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        <p className="text-[2.2vw] font-bold text-white drop-shadow-lg max-w-[70vw] leading-tight">
          ...and collaborate seamlessly. Across teams, languages, and continents.
        </p>
      </motion.div>

      {/* Outro Transition / Logo Lockup */}
      <motion.div
        className="absolute inset-0 bg-[#1e1b4b] flex flex-col items-center justify-center z-50"
        initial={{ y: "100%" }}
        animate={phase >= 3 ? { y: 0 } : { y: "100%" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <PathwaysLogo size={150} className="mb-[4vh]" />
        <h1 className="text-[6vw] font-black text-white tracking-tighter">Pathways</h1>
        <p className="text-[2.5vw] text-indigo-300 font-medium">Map your impact.</p>
        <div className="mt-[8vh] px-[3vw] py-[1.5vh] bg-indigo-600 rounded-full text-white text-[1.5vw] font-bold shadow-lg shadow-indigo-500/20">
          Start Mapping Today
        </div>
      </motion.div>
    </motion.div>
  );
}
