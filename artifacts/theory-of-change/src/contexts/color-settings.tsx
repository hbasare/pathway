import { createContext, useContext, useState, useCallback } from "react";

export type ComponentType = "opportunity" | "input" | "activity" | "output" | "outcome" | "impact";

export type ColorMap = Record<ComponentType, string>;

export const COMPONENT_TYPES: ComponentType[] = ["opportunity", "input", "activity", "output", "outcome", "impact"];

export const COLOR_DEFAULTS: ColorMap = {
  opportunity: "#10b981",
  input:       "#3b82f6",
  activity:    "#a855f7",
  output:      "#14b8a6",
  outcome:     "#f97316",
  impact:      "#f43f5e",
};

const STORAGE_KEY = "pathways_colors";

function loadColors(): ColorMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...COLOR_DEFAULTS };
    return { ...COLOR_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...COLOR_DEFAULTS };
  }
}

interface ColorSettingsCtx {
  colors: ColorMap;
  setColor: (type: ComponentType, hex: string) => void;
  resetColors: () => void;
}

const ColorCtx = createContext<ColorSettingsCtx | null>(null);

export function ColorSettingsProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState<ColorMap>(loadColors);

  const setColor = useCallback((type: ComponentType, hex: string) => {
    setColors(prev => {
      const next = { ...prev, [type]: hex };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetColors = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setColors({ ...COLOR_DEFAULTS });
  }, []);

  return (
    <ColorCtx.Provider value={{ colors, setColor, resetColors }}>
      {children}
    </ColorCtx.Provider>
  );
}

export function useColorSettings() {
  const ctx = useContext(ColorCtx);
  if (!ctx) throw new Error("useColorSettings must be used within ColorSettingsProvider");
  return ctx;
}

export function typeCardStyle(hex: string): React.CSSProperties {
  return {
    backgroundColor: hex + "18",
    borderColor: hex + "55",
    color: hex,
  };
}

export function typeHeaderStyle(hex: string): React.CSSProperties {
  return { backgroundColor: hex };
}

export function typeAccentStyle(hex: string): React.CSSProperties {
  return { backgroundColor: hex, opacity: 0.75 };
}

export function typeBorderStyle(hex: string): React.CSSProperties {
  return { borderColor: hex + "50" };
}
