import * as SecureStore from "expo-secure-store";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type FontLevel = 1 | 2 | 3;

interface FontSizeContextValue {
  fontLevel: FontLevel;
  canDecrease: boolean;
  canIncrease: boolean;
  decreaseFontLevel: () => void;
  increaseFontLevel: () => void;
  scaleFont: (baseSize: number) => number;
}

const FONT_SIZE_STORAGE_KEY = "rodabem_font_level";
const FONT_SCALE_BY_LEVEL: Record<FontLevel, number> = { 1: 0.92, 2: 1, 3: 1.12 };

const defaultValue: FontSizeContextValue = {
  fontLevel: 2,
  canDecrease: false,
  canIncrease: true,
  decreaseFontLevel: () => undefined,
  increaseFontLevel: () => undefined,
  scaleFont: (baseSize) => baseSize,
};

const FontSizeContext = createContext<FontSizeContextValue>(defaultValue);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontLevel, setFontLevel] = useState<FontLevel>(2);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(FONT_SIZE_STORAGE_KEY)
      .then((stored) => {
        const level = Number(stored);
        if (active && (level === 1 || level === 2 || level === 3)) setFontLevel(level);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setRestored(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (restored) void SecureStore.setItemAsync(FONT_SIZE_STORAGE_KEY, String(fontLevel)).catch(() => undefined);
  }, [fontLevel, restored]);

  const changeFontLevel = useCallback((change: -1 | 1) => {
    setFontLevel((current) => Math.min(3, Math.max(1, current + change)) as FontLevel);
  }, []);

  const value = useMemo<FontSizeContextValue>(() => ({
    fontLevel,
    canDecrease: fontLevel > 1,
    canIncrease: fontLevel < 3,
    decreaseFontLevel: () => changeFontLevel(-1),
    increaseFontLevel: () => changeFontLevel(1),
    scaleFont: (baseSize) => Math.round(baseSize * FONT_SCALE_BY_LEVEL[fontLevel]),
  }), [changeFontLevel, fontLevel]);

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export function useFontSize() {
  return useContext(FontSizeContext);
}
