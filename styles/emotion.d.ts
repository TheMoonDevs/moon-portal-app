
import '@emotion/react';
import { Theme as MuiTheme } from '@mui/material/styles';
import { themeType } from './theme';

declare module '@emotion/react' {
    export interface Theme extends MuiTheme, themeType{
    }
}