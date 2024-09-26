import styled from "@emotion/styled";
import { HorizontalMiniScrollBar } from "@/styles/snippets";
import theme from "@/styles/theme";
import { reverseMedia } from "@/styles/media";

export const ReferStatsSectionStyled = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  position: relative;

  ${reverseMedia.tablet} {
    flex-direction: row;
  }

  ${reverseMedia.largeMobile} {
    height: unset;
    gap: 0;
  }

  & .stats_image {
    height: auto;
    width: 100%;
    object-fit: contain;

    ${reverseMedia.tablet} {
      width: 60%;
      object-fit: contain;
    }
  }

  & .stats_container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
    text-align: center;
    gap: 1.5em;
    padding: 2.5em 2em;

    ${reverseMedia.tablet} {
      /* height: 30%; */
      flex-direction: column;
      /* align-items: center; */
      padding: 2em;
    }
  }

  & .stat_card {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;

    ${reverseMedia.tablet} {
      flex-direction: column;
    }

    ${reverseMedia.laptop} {
      flex-direction: row;
      margin-top: 1em;
    }
    /* align-items:; */
    gap: 0.5em;
    text-align: left;

    & .number {
      font-size: 3rem;
      font-weight: 900;
      font-family: "Poppins", sans-serif;
      color: ${(props) => props.theme.fixedColors.tealGreen};
      margin-right: 0.2em;
      margin-top: -0.28em;
    }

    & .caption {
      font-size: 1rem;
      font-weight: 700;
      color: ${(props) => props.theme.fixedColors.lightSilver};
      text-transform: uppercase;
    }

    & .fulltext {
      font-size: 0.8rem;
      font-weight: 400;
      opacity: 0.5;
    }

    & .highlighted_text {
      color: ${(props) => props.theme.fixedColors.tealGreen};
      /* border-bottom: 1px solid ${(props) =>
        props.theme.fixedColors.tealGreen}; */
    }
  }
`;
