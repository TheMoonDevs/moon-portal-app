import quantize, { RgbPixel } from "quantize";
import { useEffect, useState, useCallback } from "react";
import { luminance, rgbPixelToColor } from "@/helpers/functions";

enum FORMATS {
  rgb = "rgb",
  hex = "hex",
}

interface UseImageColorsProps {
  ImgSrc: string;
  settings?: Partial<ImageColorsSettings>;
}

interface ImageColorsSettings {
  colors: number;
  cors: boolean;
  windowSize: number;
  format: "rgb" | "hex";
  CHANNELS: number;
}

const DEFAULT_SETTINGS: ImageColorsSettings = {
  colors: 3,
  cors: true,
  format: "hex",
  windowSize: 50,
  CHANNELS: 4,
};

export const useImageColors = ({
  ImgSrc,
  settings = {},
}: UseImageColorsProps) => {
  const effectiveSettings = { ...DEFAULT_SETTINGS, ...settings };
  const [colors, setColors] = useState<string[]>([]);
  const [brightest, setBrightest] = useState<string>("#ffffff");
  const [darkest, setDarkest] = useState<string>("#000000");

  const getExtremeColors = (
    colors: string[]
  ): { brightest: string; darkest: string } => {
    return colors.reduce(
      ({ brightest, darkest }, currentColor) => {
        const currentLuminance = luminance(currentColor);
        const lightestLuminance = luminance(brightest);
        const darkestLuminance = luminance(darkest);

        return {
          brightest:
            currentLuminance > lightestLuminance ? currentColor : brightest,
          darkest: currentLuminance < darkestLuminance ? currentColor : darkest,
        };
      },
      { brightest: colors[0], darkest: colors[0] }
    );
  };

  const chunk = useCallback(
    (original: Uint8ClampedArray, chunkSize = 4): RgbPixel[] => {
      let data: RgbPixel[] = [];
      for (
        let i = 0;
        i < original.length;
        i += chunkSize * effectiveSettings.windowSize
      ) {
        data.push(Array.from(original.slice(i, i + chunkSize)) as RgbPixel);
      }
      return data;
    },
    [effectiveSettings.windowSize]
  );

  if (!(effectiveSettings.format in FORMATS)) {
    throw new Error("Invalid output format");
  }

  useEffect(() => {
    if (colors.length < 1) {
      const canvas = document.createElement("canvas");
      const img = document.createElement("img");
      const context = canvas.getContext("2d");

      if (effectiveSettings.cors) {
        img.setAttribute("crossOrigin", "");
      }

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        context?.drawImage(img, 0, 0);
        const { data }: ImageData =
          context?.getImageData(0, 0, img.naturalWidth, img.naturalHeight) ||
          new ImageData(img.naturalWidth, img.naturalHeight);

        const colorMap: quantize.ColorMap | false = quantize(
          chunk(data, effectiveSettings.CHANNELS),
          effectiveSettings.colors
        );
        const palette = colorMap && colorMap.palette();

        setColors(
          (palette as RgbPixel[]).map((color: RgbPixel) =>
            rgbPixelToColor(color, effectiveSettings.format)
          )
        );
      };

      img.src = ImgSrc;
    }
  }, [ImgSrc, effectiveSettings, chunk]);

  useEffect(() => {
    if (colors) {
      const { brightest, darkest } = getExtremeColors(colors);
      setDarkest(darkest);
      setBrightest(brightest);
    }
  }, [colors]);

  return { colors, brightest, darkest };
};
