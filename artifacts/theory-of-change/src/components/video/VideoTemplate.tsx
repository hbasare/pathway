import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useVideoPlayer } from "@/lib/video/hooks";
import { PathwaysLogo } from "@/components/PathwaysLogo";
import { Scene1 } from "./video_scenes/Scene1";
import { Scene2 } from "./video_scenes/Scene2";
import { Scene3 } from "./video_scenes/Scene3";
import { Scene4 } from "./video_scenes/Scene4";
import { Scene5 } from "./video_scenes/Scene5";

const SCENE_DURATIONS = {
  pain:    19000,
  brand:   20000,
  design:  17000,
  measure: 18000,
  collab:  19000,
};

const SCENE_CLIPS = [
  "pathways-scene1-v4.mp3",
  "pathways-scene2-v4.mp3",
  "pathways-scene3-v4.mp3",
  "pathways-scene4-v4.mp3",
  "pathways-scene5-v4.mp3",
];

const NETWORK_NODES = [
  { x: "12%", y: "20%", r: 4, delay: 0 },
  { x: "28%", y: "65%", r: 6, delay: 0.3 },
  { x: "42%", y: "30%", r: 5, delay: 0.6 },
  { x: "55%", y: "75%", r: 4, delay: 0.9 },
  { x: "68%", y: "18%", r: 7, delay: 1.1 },
  { x: "78%", y: "55%", r: 4, delay: 1.4 },
  { x: "88%", y: "80%", r: 6, delay: 1.7 },
  { x: "20%", y: "88%", r: 3, delay: 0.5 },
  { x: "90%", y: "30%", r: 4, delay: 1.2 },
  { x: "50%", y: "52%", r: 8, delay: 0.8 },
];

const NETWORK_EDGES = [
  { x1: "12%", y1: "20%", x2: "28%", y2: "65%", delay: 0.2 },
  { x1: "28%", y1: "65%", x2: "42%", y2: "30%", delay: 0.5 },
  { x1: "42%", y1: "30%", x2: "55%", y2: "75%", delay: 0.8 },
  { x1: "55%", y1: "75%", x2: "68%", y2: "18%", delay: 1.0 },
  { x1: "68%", y1: "18%", x2: "78%", y2: "55%", delay: 1.3 },
  { x1: "78%", y1: "55%", x2: "88%", y2: "80%", delay: 1.5 },
  { x1: "12%", y1: "20%", x2: "42%", y2: "30%", delay: 0.4 },
  { x1: "42%", y1: "30%", x2: "68%", y2: "18%", delay: 0.9 },
  { x1: "20%", y1: "88%", x2: "55%", y2: "75%", delay: 1.0 },
  { x1: "50%", y1: "52%", x2: "78%", y2: "55%", delay: 1.2 },
  { x1: "50%", y1: "52%", x2: "42%", y2: "30%", delay: 0.7 },
  { x1: "90%", y1: "30%", x2: "68%", y2: "18%", delay: 1.1 },
];

function OutroLockup() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = 1.0;
    el.play().catch((e) => console.error("Outro voice failed:", e));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-[#0d0d1a] flex flex-col items-center justify-center z-10 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.18 }}>
        {NETWORK_EDGES.map((e, i) => (
          <motion.line
            key={i}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke="#6366f1" strokeWidth="1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: e.delay, ease: "easeOut" }}
          />
        ))}
        {NETWORK_NODES.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.x} cy={n.y} r={n.r}
            fill="#818cf8"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.7] }}
            transition={{ duration: 0.6, delay: n.delay }}
          />
        ))}
      </svg>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "50vw", height: "50vw",
          background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        }}
      />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-[3vh]"
      >
        <PathwaysLogo size={120} />
      </motion.div>
      <motion.h1
        className="text-[6vw] font-black text-white tracking-tighter"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.3 }}
      >
        Pathways
      </motion.h1>
      <motion.p
        className="text-[2.5vw] text-indigo-300 font-medium mt-[0.5vh]"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.5 }}
      >
        Map your impact.
      </motion.p>
      <motion.div
        className="mt-[6vh] px-[3vw] py-[1.5vh] bg-indigo-600 rounded-full text-white text-[1.5vw] font-bold"
        style={{ boxShadow: "0 0 32px rgba(99,102,241,0.45)" }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.7 }}
      >
        Start Mapping Today
      </motion.div>
      <motion.button
        className="mt-[2.5vh] flex items-center gap-[0.6vw] text-[1.1vw] text-indigo-300/60 hover:text-white transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        onClick={() => window.location.reload()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="1.2vw" height="1.2vw">
          <path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
        </svg>
        Watch again
      </motion.button>

      <audio ref={audioRef} src={`${import.meta.env.BASE_URL}audio/pathways-outro.mp3`} preload="auto" />
    </motion.div>
  );
}

// Inner component — only mounts when the user clicks play.
// This ensures useVideoPlayer's timer starts at exactly t=0 of Scene 1,
// not on page load (which would eat into Scene 1's duration before play).
function VideoPlayer({ onComplete }: { onComplete: () => void }) {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const BASE = import.meta.env.BASE_URL;

  const musicRef  = useRef<HTMLAudioElement>(null);
  const sceneRef0 = useRef<HTMLAudioElement>(null);
  const sceneRef1 = useRef<HTMLAudioElement>(null);
  const sceneRef2 = useRef<HTMLAudioElement>(null);
  const sceneRef3 = useRef<HTMLAudioElement>(null);
  const sceneRef4 = useRef<HTMLAudioElement>(null);
  const sceneRefs = [sceneRef0, sceneRef1, sceneRef2, sceneRef3, sceneRef4];

  const prevSceneRef = useRef<number>(0);
  const completedRef = useRef(false);

  // Start music immediately on mount (user already clicked play)
  useEffect(() => {
    const music = musicRef.current;
    if (music) {
      music.volume = 0.18;
      music.play().catch((e) => console.error("Music play failed:", e));
    }
  }, []);

  // Detect loop-back (hook resets to 0 after last scene = video complete)
  useEffect(() => {
    if (prevSceneRef.current === 4 && currentScene === 0) {
      completedRef.current = true;
      sceneRefs.forEach((ref) => {
        if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
      });
      const music = musicRef.current;
      if (music) {
        const step = music.volume / 25;
        const fade = setInterval(() => {
          if (music.volume > step) {
            music.volume = Math.max(0, music.volume - step);
          } else {
            music.volume = 0;
            music.pause();
            clearInterval(fade);
          }
        }, 100);
      }
      onComplete();
    }
    prevSceneRef.current = currentScene;
  }, [currentScene]);

  // Per-scene voice sync — fires on mount (scene 0) and every scene change
  useEffect(() => {
    if (completedRef.current) return;
    sceneRefs.forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      if (i === currentScene) {
        el.pause();
        el.currentTime = 0;
        el.volume = 1.0;
        el.play().catch((e) => console.error(`Scene ${i + 1} voice failed:`, e));
      } else {
        el.pause();
        el.currentTime = 0;
      }
    });
  }, [currentScene]);

  return (
    <>
      <AnimatePresence mode="sync">
        {currentScene === 0 && <Scene1 key="scene1" />}
        {currentScene === 1 && <Scene2 key="scene2" />}
        {currentScene === 2 && <Scene3 key="scene3" />}
        {currentScene === 3 && <Scene4 key="scene4" />}
        {currentScene === 4 && <Scene5 key="scene5" />}
      </AnimatePresence>

      {SCENE_CLIPS.map((clip, i) => (
        <audio key={clip} ref={sceneRefs[i]} src={`${BASE}audio/${clip}`} preload="auto" />
      ))}
      <audio ref={musicRef} src={`${BASE}audio/pathways-music-upbeat.mp3`} preload="auto" loop />
    </>
  );
}

export default function VideoTemplate() {
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0a] text-white font-sans flex items-center justify-center">
      {/* Persistent animated background */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[100px] opacity-20"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)" }}
          animate={{ x: ["-10%", "50%", "-10%"], y: ["-20%", "30%", "-20%"], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[80px] opacity-15"
          style={{ background: "radial-gradient(circle, #4338ca, transparent)" }}
          animate={{ x: ["50%", "-20%", "50%"], y: ["40%", "-10%", "40%"], scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0zOSAzOVYwaC0xdjM5SDB2MXozOSAzOVYwaC0xdjM5SDB2MXoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==')] opacity-30" />
      </div>

      {/* Video player — only mounts after play is clicked so timer starts at t=0 */}
      {started && !completed && <VideoPlayer onComplete={() => setCompleted(true)} />}

      {/* Outro lockup — shown after all scenes finish */}
      {completed && <OutroLockup />}

      {/* Click-to-play overlay */}
      <AnimatePresence>
        {!started && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
            style={{ background: "rgba(10,10,10,0.72)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => setStarted(true)}
          >
            <motion.div
              className="w-[7vw] h-[7vw] rounded-full border-2 border-white/60 flex items-center justify-center mb-[2vh]"
              whileHover={{ scale: 1.08, borderColor: "rgba(255,255,255,0.9)" }}
            >
              <svg viewBox="0 0 24 24" fill="white" width="40%" height="40%">
                <path d="M8 5v14l11-7z" />
              </svg>
            </motion.div>
            <p className="text-[1.4vw] text-white/70 tracking-wide">Click to play with sound</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
