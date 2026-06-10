import { useState, useEffect, useCallback, useRef } from 'react';

// Custom hook to manage video scenes and recording lifecycle
export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const sceneKeys = Object.keys(durations);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const isFirstPass = useRef(true);

  const goToNextScene = useCallback(() => {
    setCurrentSceneIndex((prev) => {
      const next = prev + 1;
      if (next >= sceneKeys.length) {
        if (isFirstPass.current) {
          isFirstPass.current = false;
          // @ts-ignore
          window.stopRecording?.();
        }
        return 0; // Loop
      }
      return next;
    });
  }, [sceneKeys.length]);

  useEffect(() => {
    // Start recording on mount
    // @ts-ignore
    window.startRecording?.();
  }, []);

  useEffect(() => {
    const currentKey = sceneKeys[currentSceneIndex];
    const duration = durations[currentKey];
    
    if (!duration) return;

    const timer = setTimeout(goToNextScene, duration);
    return () => clearTimeout(timer);
  }, [currentSceneIndex, durations, sceneKeys, goToNextScene]);

  return { currentScene: currentSceneIndex, currentSceneKey: sceneKeys[currentSceneIndex] };
}
