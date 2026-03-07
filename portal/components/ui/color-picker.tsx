"use client";

import React, { forwardRef, useMemo } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Paintbrush } from "lucide-react";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
  defaultColor?: string;
}

export const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ color, onChange, className, defaultColor = "#000000" }, ref) => {
    const value = color || defaultColor;

    // Check luminance of the first 6 characters to determine icon color
    const isDark = useMemo(() => {
      const hex = value.replace('#', '').padEnd(6, '0');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
      return luminance < 128;
    }, [value]);

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div
            ref={ref}
            className={cn(
              "flex h-8 w-10 cursor-pointer items-center justify-center rounded-none border border-black",
              className
            )}
            style={{ backgroundColor: value }}
            title="Pick a color"
          >
            {/* If color is dark, make icon white, else black */}
            <Paintbrush 
              className="h-4 w-4" 
              style={{ color: isDark ? '#fff' : '#000' }} 
            />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto rounded-none border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
          align="start"
        >
          <div className="flex flex-col gap-3">
            <HexAlphaColorPicker color={value} onChange={onChange} />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase">Hex</span>
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 rounded-none border-black text-xs font-mono uppercase focus-visible:ring-0 focus-visible:border-black"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);
ColorPicker.displayName = "ColorPicker";
