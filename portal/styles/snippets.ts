import styled from "@emotion/styled";
import theme from "@/styles/theme";
import media from "@/styles/media";

export const SingleLine = `
line-height: 1.15;
max-height: 1.15;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
`;

export const MutedText = `
  opacity: 0.5;
`

export const CapsText = `
  text-transform: uppercase;
  letter-spacing: 0.1em;
`

export const CleanAnchor = `
    text-decoration: none !important;
    outline: none !important;
`;

export const VerticalScrollBar = `
  scrollbar-width: 10px;
  scrollbar-color: ${theme.colors.primary};

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${theme.colors.primary};
    outline: 1px solid slategrey;
  }
`;

export const HorizontalScrollBar = `
  scrollbar-width: 10px;
  scrollbar-color: ${theme.colors.primary};

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${theme.colors.primary};;
    outline: 1px solid slategrey;
  }
`;

export const HorizontalMiniScrollBar = (color:string, border:number) => `
  scrollbar-width: 10px;
  scrollbar-color: transparent;

  &::-webkit-scrollbar {
    height: 1px;
  }

  &::-webkit-scrollbar-track {
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0);
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${(props:any) => props.theme.colors.borderGrey};
    //outline: 1px solid slategrey;
    ${media.largeMobile} {
      background-color: ${(props:any) => color || props.theme.colors.textGrey};
    }
  }
`;

export const FontBgGradient = (opacity = 1) => `
background-image: linear-gradient(to right, rgba(107, 1, 185,${opacity}), rgba(186, 3, 168,${opacity}) , rgba(246, 100, 14,${opacity}));
`

export const FonTextGradient = (opacity = 1) => `
  background-image: -webkit-linear-gradient(rgba(107, 1, 185,${opacity}), rgba(186, 3, 168,${opacity}) , rgba(246, 100, 14,${opacity}));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`
