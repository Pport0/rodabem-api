import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type FontLevel = 1 | 2 | 3;

interface FontSizeContextType {
  fontLevel: FontLevel;
  canDecrease: boolean;
  canIncrease: boolean;
  decreaseFontLevel: () => void;
  increaseFontLevel: () => void;
  scaleFont: (baseSize: number) => number;
}

const FONT_SIZE_STORAGE_KEY = 'rodabem_font_level';
const FONT_SCALE_BY_LEVEL: Record<FontLevel, number> = {
  1: 0.92,
  2: 1,
  3: 1.12,
};

const FontSizeContext = createContext<FontSizeContextType | null>(null);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontLevel, setFontLevel] = useState<FontLevel>(2);

  useEffect(() => {
    const storedLevel = SecureStore.getItem(FONT_SIZE_STORAGE_KEY);
    const parsedLevel = Number(storedLevel);

    if (parsedLevel === 1 || parsedLevel === 2 || parsedLevel === 3) {
      setFontLevel(parsedLevel);
    }
  }, []);

  const updateFontLevel = (nextLevel: FontLevel) => {
    setFontLevel(nextLevel);
    SecureStore.setItem(FONT_SIZE_STORAGE_KEY, String(nextLevel));
  };

  const value = useMemo<FontSizeContextType>(
    () => ({
      fontLevel,
      canDecrease: fontLevel > 1,
      canIncrease: fontLevel < 3,
      decreaseFontLevel: () =>
        updateFontLevel(Math.max(1, fontLevel - 1) as FontLevel),
      increaseFontLevel: () =>
        updateFontLevel(Math.min(3, fontLevel + 1) as FontLevel),
      scaleFont: (baseSize: number) =>
        Math.round(baseSize * FONT_SCALE_BY_LEVEL[fontLevel]),
    }),
    [fontLevel]
  );

  return (
    <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);

  if (!context) {
    throw new Error('useFontSize must be used within FontSizeProvider');
  }

  return context;
}
