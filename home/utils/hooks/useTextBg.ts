'use client'
import { useState, useEffect } from "react";
import { luminance } from "@/helpers/functions";

interface UseTextBgProps {
  colors: string[];
  textSettings?: TextSettings;
}

interface TextSettings {
  textColor: string;
  textSize: "small" | "large";
  textLevel: "AA" | "AAA";
}

const DEFAULT_TEXT_SETTINGS: TextSettings = {
  textColor: "#000000",
  textSize: "small",
  textLevel: "AA",
};

export const useTextBg = ({ colors, textSettings }: UseTextBgProps) => {
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const { textColor, textSize, textLevel } = {
    ...DEFAULT_TEXT_SETTINGS,
    ...textSettings,
  };

  useEffect(() => {
    if (colors) {
      for (let i = 0; i < colors.length; i++) {
        const l1 = luminance(colors[i] as string);
        const l2 = luminance(textColor);
        const ratio =
          l1 > l2 ? (l2 + 0.05) / (l1 + 0.05) : (l1 + 0.05) / (l2 + 0.05);

        const ratioLookup = {
          largeAA: 1 / 3,
          largeAAA: 1 / 4.5,
          smallAA: 1 / 4.5,
          smallAAA: 1 / 7,
        };

        let pass = ratio < ratioLookup[`${textSize}${textLevel}`];

        if (pass) {
          setBgColor(colors[i] as string);
          break;
        }
      }
    }
  }, [colors, textColor, textSize, textLevel]);

  return { bgColor };
};
