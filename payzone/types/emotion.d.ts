import { themeType } from '@/styles/theme';
import '@emotion/react';
import { Theme as MuiTheme } from '@mui/material/styles';

declare module '@emotion/react' {
    export interface Theme extends MuiTheme, themeType{
    }
}

declare global {
  interface Window {
    ethereum?: any;
  }
}