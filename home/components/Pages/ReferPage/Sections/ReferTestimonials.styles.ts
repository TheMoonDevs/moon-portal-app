import { reverseMedia } from "@/styles/media";
import { HorizontalMiniScrollBar } from "@/styles/snippets";
import theme from "@/styles/theme";
import styled from "@emotion/styled";

export const TestimonialsStyled = styled.div`
  height: 100vh;
  background: ${(props) => props.theme.fixedColors.white};
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0rem;
  align-items: center;
  & .heading {
    font-size: 2rem;
    font-weight: 700;
    text-align: center;
    padding: 0.5rem 0 0.5rem 0;
    color: ${(props) => props.theme.fixedColors.charcoal};

    ${reverseMedia.tablet} {
      font-size: 3rem;
      padding: 2rem 0 0.5rem 0;
    }
  }

  & .subheading {
    font-size: 1rem;
    text-align: center;
    color: ${(props) => props.theme.fixedColors.charcoal};
    ${reverseMedia.laptop} {
      font-size: 1.3rem;
    }
  }
  & .highlighted_text {
    color: ${(props) => props.theme.fixedColors.tealGreen};
  }

  & .testimonials {
    padding: 1rem 0rem;
    /* height: 60%; */

    width: 100%;
    align-self: stretch;
    display: flex;
    flex-direction: row;
    cursor: grabbing;
    align-items: center;
    text-align: center;
    overflow-x: hidden;
    overflow-y: hidden;
    color: ${(props) => props.theme.fixedColors.charcoal};
    background-color: ${(props) => props.theme.fixedColors.white};
    ${HorizontalMiniScrollBar(theme.fixedColors.tealGreen)};
    > ul {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-items: flex-start;
    }
  }

  & .testimonial_card {
    -webkit-user-select: none; /* Safari */
    -ms-user-select: none; /* IE 10 and IE 11 */
    user-select: none; /* Standard syntax */
    min-height: 450px;
    max-height: 450px;
    flex: 0 0 min(91.5%, 450px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    text-align: left;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    margin: 1em;
  }

  & .testimonial_content {
    padding: 1.5em;
  }

  & .name {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5em;
    font-size: 1.2rem;
    font-weight: 700;

    > img {
      fill: ${(props) => props.theme.fixedColors.tealGreen};
    }
  }

  & .position {
    font-size: 0.8rem;
    font-weight: 400;
    opacity: 0.5;
  }

  & .review_box {
    position: relative;
  }

  & .quote_icon_left {
    color: ${(props) => props.theme.fixedColors.tealGreen};
    font-size: 4rem;
    transform: rotateY(180deg);
    pointer-events: none;
  }

  & .quote_icon_bg {
    font-size: 10rem;
    position: absolute;
    display: block;
    right: 0;
    bottom: -3rem;
    z-index: 9;
    opacity: 0.1;
    color: ${(props) => props.theme.fixedColors.tealGreen};
    pointer-events: none;
  }

  & .review {
    position: relative;
    font-size: 1.2rem;
    font-weight: 400;
    line-height: 1.5;
    z-index: 10;
  }

  & .testimonial_footer {
    align-self: stretch;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    & .icon {
      font-size: 1rem;
    }
    padding-bottom: 1em;
  }

  & .icon_link {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 0.5em;
    padding: 0.5em 1em 0.5em 2em;
    border-top-left-radius: 3em;
    color: ${(props) => props.theme.fixedColors.tealGreen};
    background-color: ${(props) => props.theme.fixedColors.black};
  }

  & .engagement_span {
    font-size: 0.7rem;
    padding: 0em 2em 0em 0em;
  }
`;
