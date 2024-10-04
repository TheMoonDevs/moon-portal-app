import { RgbPixel } from "quantize";

export function generateSlug(length: number): string {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    slug += charset[randomIndex];
  }

  return slug;
}

export const determineColorFormat = (color: string): "rgb" | "hex" => {
  if (/^#?[0-9A-F]{3}([0-9A-F]{3})?$/i.test(color)) return "hex";
  if (/^rgb\(/.test(color)) return "rgb";
  throw new Error("Unknown color format");
};

export const rgbToHex = (rgb: string): string => {
  const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
};

export const hexToRgb = (hex: string): string => {
  let r = 0,
    g = 0,
    b = 0;
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  }
  return `rgb(${r}, ${g}, ${b})`;
};

export const colorToRgbPixel = (color: string): RgbPixel => {
  const format = determineColorFormat(color);
  if (format === "rgb") {
    const [r, g, b] = color.match(/\d+/g)!.map(Number);
    return [r, g, b];
  }
  if (format === "hex") {
    const [r, g, b] = hexToRgb(color).match(/\d+/g)!.map(Number);
    return [r, g, b];
  }
  throw new Error("Unknown color format");
};

export const rgbPixelToColor = (
  rgbPixel: RgbPixel,
  toFormat: "rgb" | "hex"
): string => {
  const [r, g, b] = rgbPixel;
  if (toFormat === "rgb") {
    return `rgb(${r}, ${g}, ${b})`;
  } else if (toFormat === "hex") {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  } else {
    throw new Error("Unsupported format");
  }
};

export const luminance = (color: string): number => {
  const RgbPixel = colorToRgbPixel(color);
  var a = RgbPixel.map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

