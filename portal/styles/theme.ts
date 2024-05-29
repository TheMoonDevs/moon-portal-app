import { createTheme,  } from '@mui/material/styles'
import {PaletteMode} from '@mui/material';

const IS_DARK_MODE = false

const commonTheme = {
  customTransitions: {
    default: '.2s linear',
    easein: '.5s ease-in',
  },
  contentWidths: {
    headerHeight: '100px',
    headerHeightMobile: '80px',
    pageContentMaxWidth: '1200px',
    headerMaxWidth: '80vw',
    headerMaxWidthTablet: '90vw',
    safeBoxDefault: '70vw',
    safeBoxLargeLaptop: '90vw',
    safeBoxTablet: '95vw',
  },
  fixedColors: {
    white: '#FFF',
    black: '#000',
    bgGrey: '#1C1E22',
    textGrey: '#6C6C6C',
    borderGrey: '#E8E6F1',
    white_f:
      'invert(100%) sepia(100%) saturate(0%) hue-rotate(288deg) brightness(102%) contrast(102%)',
    grey_f:
      'invert(85%) sepia(1%) saturate(0%) hue-rotate(28deg) brightness(85%) contrast(90%)',
    black_f: 'unset',
    semiBlack: 'rgba(0, 0, 0, .5)',
    semiWhite: 'rgba(255, 255, 255, .15)',
  },
  screens: {
    largeMobile: 480,
    tablet: 768,
    laptop: 1024,
    largeLaptop: 1280,
  },
  zIndex: {
    modal: 9,
  },
  typography: {
    fontFamily: ['DM Sans', 'Roboto', '"Segoe UI"'].join(','),
  },
}

export const lightTheme = {
  ...commonTheme,
  colors: {
    white: '#FFF',
    black: '#000',
    blue: '#4294F7',
    red: '#ff3333',
    orange: "#F5841F",
    naviBlueDark: '#262f56',
    primary: '#FFD800',
    textBlack: '#141414',
    textGrey: '#6C6C6C',
    textLightGrey: '#999999',
    borderGrey: '#E8E6F1',
    borderLightGrey: '#F4F6F8',
    borderDarkGrey: '#d9d9d9',
    backgroundLightPurple: '#F9F8FB',
    backgroundLightGrey: '#f1f1f1',
    brandedLightPurple: 'rgba(141, 122, 177, 0.1)',
    lightGreen: 'rgba(73, 176, 24, 0.05)',
    lightRed: 'rgba(196, 12, 35, 0.05)',
    Green: 'rgba(73, 176, 24, 1)',
    Red: 'rbga(176, 24, 43, 1)',
    semiBlack: 'rgba(0, 0, 0, .5)',
    semiLightBlack: 'rgba(0, 0, 0, .2)',
    semiWhite: 'rgba(255, 255, 255, .15)',
  },
  filters: {
    primaryDark:
    'invert(85%) sepia(42%) saturate(2239%) hue-rotate(358deg) brightness(101%) contrast(106%)',
  primary:
    'invert(85%) sepia(42%) saturate(2239%) hue-rotate(358deg) brightness(101%) contrast(106%)',
    yellow: 
    'invert(85%) sepia(42%) saturate(2239%) hue-rotate(358deg) brightness(101%) contrast(106%)',
    white:
      'invert(100%) sepia(100%) saturate(0%) hue-rotate(288deg) brightness(102%) contrast(102%)',
    grey:
      'invert(85%) sepia(1%) saturate(0%) hue-rotate(28deg) brightness(85%) contrast(90%)',
    green:
      'invert(59%) sepia(27%) saturate(2073%) hue-rotate(80deg) brightness(92%) contrast(85%)',
    red:
      'invert(30%) sepia(86%) saturate(2025%) hue-rotate(339deg) brightness(109%) contrast(116%)',
    blue:
      'invert(47%) sepia(100%) saturate(1841%) hue-rotate(194deg) brightness(103%) contrast(94%)',
    black: 'unset',
  },
  hoverEffects: {
    primaryShadow: '0 8px 26px rgba(141, 122, 177, .5)',
    primaryGlow: '0 20px 26px rgba(141, 122, 177, .8)',
    greyLightShadow: '0 5px 100px rgba(0, 0, 0, 0.1)',
    primaryLighterShadow: '0 8px 20px rgba(255, 216, 0, .1)',
    primaryLightShadow: '0 8px 20px rgba(141, 122, 177, .35)',
    primaryDarkShadow: '0 8px 20px rgba(141, 122, 177, .15)',
    blackLightShadow: '0 8px 20px rgba(0, 0, 0, .15)',
    cardShadow: '0 8px 26px rgba(141, 122, 177, .85)',
  },
  palette: {
    mode: "light" as PaletteMode,
    primary: {
      main: '#FFD800',
    },
    accent: {
      main: '#0d97e0',
    },
    yellow: {
      main: '#FFD400',
      darker: '#d4b20f',
    },
    black: {
      main: '#6C6C6C',
      darker: '#6C6C6C',
    },
    white: {
      main: '#FFF',
    },
  },
}

export const darkTheme = {
  ...commonTheme,
  colors: {
    white: '#000',
    black: '#FFF',
    blue: '#4294F7',
    red: '#ff3333',
    orange: "#F5841F",
    naviBlueDark: '#FFF',
    primary: '#FFD800',
    textBlack: '#F2F2F2',
    textGrey: '#C4C4C4',
    textLightGrey: '#7F7F7F',
    borderGrey: '#222223',
    borderLightGrey: '#29292b',
    borderDarkGrey: '#1B1B1C',
    backgroundLightPurple: '#19171C',
    backgroundLightGrey: '#252428',
    brandedLightPurple: 'rgba(141, 122, 177, 0.1)',
    lightGreen: 'rgba(73, 176, 24, 0.05)',
    lightRed: 'rgba(196, 12, 35, 0.05)',
    Green: 'rgba(73, 176, 24, 1)',
    Red: 'rbga(176, 24, 43, 1)',
    semiBlack: 'rgba(255, 255, 255, .5)',
    semiLightBlack: 'rgba(255, 255, 255, .2)',
    semiWhite: 'rgba(0, 0, 0, .15)',
  },
  filters: {
    primaryDark:
      'invert(85%) sepia(42%) saturate(2239%) hue-rotate(358deg) brightness(101%) contrast(106%)',
    primary:
      'invert(85%) sepia(42%) saturate(2239%) hue-rotate(358deg) brightness(101%) contrast(106%)',
    white: 'unset',
    yellow: 
    'invert(85%) sepia(42%) saturate(2239%) hue-rotate(358deg) brightness(101%) contrast(106%)',
    grey:
      'invert(85%) sepia(1%) saturate(0%) hue-rotate(28deg) brightness(85%) contrast(90%)',
    green:
      'invert(59%) sepia(27%) saturate(2073%) hue-rotate(80deg) brightness(92%) contrast(85%)',
    red:
      'invert(30%) sepia(86%) saturate(2025%) hue-rotate(339deg) brightness(109%) contrast(116%)',
    blue:
      'invert(47%) sepia(100%) saturate(1841%) hue-rotate(194deg) brightness(103%) contrast(94%)',
    black:
      'invert(100%) sepia(100%) saturate(0%) hue-rotate(288deg) brightness(102%) contrast(102%)',
  },
  hoverEffects: {
    primaryShadow: '0 8px 26px rgba(255, 216, 0, .5)',
    primaryGlow: '0 0px 100px rgba(255, 216, 0, .6)',
    greyLightShadow: '0 5px 100px rgba(0, 0, 0, 0.1)',
    primaryLighterShadow: '0 8px 20px rgba(255, 216, 0, .1)',
    primaryLightShadow: '0 8px 20px rgba(255, 216, 0, .15)',
    primaryDarkShadow: '0 8px 20px rgba(255, 216, 0, .35)',
    blackLightShadow: '0 8px 20px rgba(0, 0, 0, .15)',
    cardShadow: '0px 6px 17.3px rgba(255, 216, 0, 0.2)',
  },
  palette: {
    mode: "dark" as PaletteMode,
    background: {
      // default: "#212121",
    },
    primary: {
      main: '#FFD800',
    },
    accent: {
      main: '#0d97e0',
    },
    yellow: {
      main: '#FFD400',
      darker: '#d4b20f',
    },
    white: {
      main: '#FFF',
      darker: '#FFF',
    },
    black: {
      main: '#000',
    },
  },
}

export default IS_DARK_MODE ? darkTheme : lightTheme

export type themeType = typeof lightTheme
