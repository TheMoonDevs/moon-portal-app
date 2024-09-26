import { css } from "@emotion/react";
import theme from "./theme";
import media from "./media";
import { VerticalScrollBar, rotationAnime } from "./snippets";

const globalStyles = css`
  * {
    font-family: inherit;
    outline-color: #8d7ab1;
  }

  html,
  body {
    position: static !important;
    font-family: "DM Sans", Arial, sans-serif;
  }

  .MuiPopover-root {
    margin-right: 0px;
    ${media.largeMobile} {
      margin-right: 0px;
    }
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p,
  ul,
  ol {
    margin: 0;
  }

  label,
  button {
    cursor: pointer;
  }

  ul,
  ol,
  button {
    padding: 0;
  }

  button {
    background: none;
    border: none;
    -webkit-user-select: none; /* Safari */
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE10+/Edge */
    user-select: none; /* Standard */
  }

  ul {
    list-style-type: none;
  }

  textarea,
  input[type="text"],
  input[type="email"] {
    -webkit-appearance: none;
  }

  .underlined {
    text-decoration: underline;
  }

  .striked {
    text-decoration: line-through;
  }

  .circular {
    border-radius: 50%;
  }

  .clickable {
    cursor: pointer;
    opacity: 0.5;
    transition: ${theme.customTransitions.fast};

    &:hover,
    &:focus {
      opacity: 1;
    }
  }

  .vert_scrollable {
    ${VerticalScrollBar}
  }

  .no_highlights {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .unselectable {
    -webkit-user-select: none; /* Safari */
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE10+/Edge */
    user-select: none; /* Standard */
  }

  .nolink {
    text-decoration: none !important;
    outline: none !important;
  }

  .rotating {
    ${rotationAnime("2s")}
  }

  .onlylap {
    display: none;
    ${media.largeLaptop} {
      display: flex;
    }
  }

  .onlymob {
    display: none;
    ${media.largeMobile} {
      display: flex;
    }
  }

  ${media.tablet} {
    .notab {
      display: none;
    }
  }

  ${media.largeMobile} {
    .nomob {
      display: none;
    }
  }

  .material-symbols-outlined {
    font-variation-settings: "FILL" 0, "wght" 300, "GRAD" 0, "opsz" 24;
  }

  .ms-thin {
    font-variation-settings: "FILL" 0, "wght" 100, "GRAD" 0, "opsz" 24;
  }

  .ms-thick {
    font-variation-settings: "FILL" 0, "wght" 600, "GRAD" 0, "opsz" 24;
  }

  :root {
    --toastify-color-info: ${theme.colors.primary};
    --toastify-color-progress-info: ${theme.colors.primary};
  }
`;

export default globalStyles;
