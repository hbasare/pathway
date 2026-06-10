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
  pain: 9000,
  brand: 7000,
  features: 15000,
  collab: 12000,
  outro: 9000,
};

const SCENE_CLIPS = [
  "pathways-scene1-v2.mp3",
  "pathways-scene2-v2.mp3",
  "pathways-scene3-v2.mp3",
  "pathways-scene4-v2.mp3",
  "pathways-scene5-v2.mp3",
];

function OutroLockup() {
  return (
    <motion.div
      className="absolute inset-0 bg-[#1e1b4b] flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <PathwaysLogo size={150} className="mb-[4vh]" />
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
        className="text-[2.5vw] text-indigo-300 font-medium mt-[1vh]"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.5 }}
      >
        Map your impact.
      </motion.p>
      <motion.div
        className="mt-[8vh] px-[3vw] py-[1.5vh] bg-indigo-600 rounded-full text-white text-[1.5vw] font-bold shadow-lg shadow-indigo-500/20"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.7 }}
      >
        Start Mapping Today
      </motion.div>
    </motion.div>
  );
}

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const musicRef = useRef<HTMLAudioElement>(null);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const prevSceneRef = useRef<number>(0);

  const sceneRef0 = useRef<HTMLAudioElement>(null);
  const sceneRef1 = useRef<HTMLAudioElement>(null);
  const sceneRef2 = useRef<HTMLAudioElement>(null);
  const sceneRef3 = useRef<HTMLAudioElement>(null);
  const sceneRef4 = useRef<HTMLAudioElement>(null);
  const sceneRefs = [sceneRef0, sceneRef1, sceneRef2, sceneRef3, sceneRef4];

  const handleStart = () => {
    const music = musicRef.current;
    if (music) {
      music.pause();
      music.currentTime = 0;
      music.volume = 0.18;
      music.load();
      music.play().catch((e) => console.error("Music play failed:", e));
    }

    const voice = sceneRefs[0].current;
    if (voice) {
      voice.pause();
      voice.currentTime = 0;
      voice.volume = 1.0;
      voice.load();
      voice.play().catch((e) => console.error("Scene 1 voice failed:", e));
    }

    setStarted(true);
  };

  // Detect loop: hook resets currentScene to 0 after the last scene
  useEffect(() => {
    if (started && prevSceneRef.current === 4 && currentScene === 0) {
      setCompleted(true);

      // Stop all voiceover clips
      sceneRefs.forEach((ref) => {
        if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
      });

      // Fade music out over ~2.5 seconds then stop
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
    }
    prevSceneRef.current = currentScene;
  }, [currentScene, started]);

  // Per-scene voice sync
  useEffect(() => {
    if (!started || completed) return;

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
  }, [currentScene, started, completed]);

  const BASE = import.meta.env.BASE_URL;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0a] text-white font-sans flex items-center justify-center">
      {/* Persistent Background */}
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

      {/* Scenes — hidden once video completes */}
      {!completed && (
        <AnimatePresence mode="sync">
          {currentScene === 0 && <Scene1 key="scene1" />}
          {currentScene === 1 && <Scene2 key="scene2" />}
          {currentScene === 2 && <Scene3 key="scene3" />}
          {currentScene === 3 && <Scene4 key="scene4" />}
          {currentScene === 4 && <Scene5 key="scene5" />}
        </AnimatePresence>
      )}

      {/* Final outro — replaces scenes when video completes */}
      {completed && <OutroLockup />}

      {/* Per-scene voice tracks */}
      {SCENE_CLIPS.map((clip, i) => (
        <audio key={clip} ref={sceneRefs[i]} src={`${BASE}audio/${clip}`} preload="auto" />
      ))}

      {/* Background music */}
      <audio ref={musicRef} src={`${BASE}audio/pathways-music-upbeat.mp3`} preload="auto" loop />

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
            onClick={handleStart}
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
