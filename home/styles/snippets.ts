import styled from "@emotion/styled";
import theme from "@/styles/theme";
import media from "@/styles/media";

export const SlideInBlurredLeft = (seconds: number, classname: string) => `
.${classname}{
  -webkit-animation: slide-in-blurred-left ${seconds}s cubic-bezier(0.23, 1, 0.32, 1)
    both;
  animation: slide-in-blurred-left ${seconds}s cubic-bezier(0.23, 1, 0.32, 1) both;
}
@-webkit-keyframes slide-in-blurred-left {
  0% {
    -webkit-transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
    transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
    -webkit-transform-origin: 100% 50%;
    transform-origin: 100% 50%;
    -webkit-filter: blur(40px);
    filter: blur(40px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateX(0) scaleY(1) scaleX(1);
    transform: translateX(0) scaleY(1) scaleX(1);
    -webkit-transform-origin: 50% 50%;
    transform-origin: 50% 50%;
    -webkit-filter: blur(0);
    filter: blur(0);
    opacity: 1;
  }
}
@keyframes slide-in-blurred-left {
  0% {
    -webkit-transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
    transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
    -webkit-transform-origin: 100% 50%;
    transform-origin: 100% 50%;
    -webkit-filter: blur(40px);
    filter: blur(40px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateX(0) scaleY(1) scaleX(1);
    transform: translateX(0) scaleY(1) scaleX(1);
    -webkit-transform-origin: 50% 50%;
    transform-origin: 50% 50%;
    -webkit-filter: blur(0);
    filter: blur(0);
    opacity: 1;
  }
}

`;

export const FadeInAnimation = (seconds: number, classname: string) => `
.${classname}{
  opacity: 0;
  animation: fade_in ${seconds}s ease-out forwards;
  animation-delay: 1s;
}
@keyframes fade_in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
`;

export const UpDownAnimation = (
  offset: number,
  seconds: number,
  classname: string
) => `

.${classname} {
  animation: up-down-s linear ${seconds}s;
  animation-iteration-count: infinite;
  animation-direction: alternate-reverse;
}

@keyframes up-down-s {
  0% {
    transform: translate(0px, ${10 + offset}px);
  }
  100% {
    transform: translate(0px, 10px);
  }
}

@-moz-keyframes up-down-s {
  0% {
    transform: translate(0px, ${10 + offset}px);
  }
  100% {
    transform: translate(0px, 10px);
  }
}

@-webkit-keyframes up-down-s {
  0% {
    transform: translate(0px, ${10 + offset}px);
  }
  100% {
    transform: translate(0px, 10px);
  }
}

@-o-keyframes up-down-s {
  0% {
    transform: translate(0px, ${10 + offset}px);
  }
  100% {
    transform: translate(0px, 10px);
  }
}

@-ms-keyframes up-down-s {
  0% {
    transform: translate(0px, ${10 + offset}px);
  }
  100% {
    transform: translate(0px, 10px);
  }
}
`;

export const SingleLine = `
line-height: 1.15;
max-height: 1.15;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
`;

export const MutedText = `
  opacity: 0.5;
`;

export const CapsText = `
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

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

export const HorizontalMiniScrollBar = (color?: string, border?: number) => `
  scrollbar-width: 4px;
  scrollbar-color: transparent;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0);
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${color || theme.colors.borderGrey};
    outline: 1px solid slategrey;
    ${media.largeMobile} {
      background-color: ${color || theme.colors.borderGrey};
    }
  }
`;

export const FontBgGradient = (opacity = 1) => `
background-image: linear-gradient(to right, rgba(107, 1, 185,${opacity}), rgba(186, 3, 168,${opacity}) , rgba(246, 100, 14,${opacity}));
`;

export const FonTextGradient = (opacity = 1) => `
  background-image: -webkit-linear-gradient(rgba(107, 1, 185,${opacity}), rgba(186, 3, 168,${opacity}) , rgba(246, 100, 14,${opacity}));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const rotationAnime = (duration: string) => `
animation: rotating ${duration} linear infinite;
@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
`;
