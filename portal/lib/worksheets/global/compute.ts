export const globalComputes = {
  "__builtin.serial": ({ window }: { window?: { rowIndex: number } }) => {
    if (!window) return "";
    return window.rowIndex + 1;
  },
} as const;
