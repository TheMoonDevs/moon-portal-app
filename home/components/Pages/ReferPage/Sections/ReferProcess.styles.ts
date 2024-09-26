import { reverseMedia } from "@/styles/media";
import styled from "@emotion/styled";

export const ReferProcessSectionStyled = styled.div`
  height: 100vh;
  background-color: ${(props) => props.theme.fixedColors.white};
  color: ${(props) => props.theme.fixedColors.charcoal};
  padding: 0rem 0rem;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0rem;
  align-items: flex-start;

  & .section_title {
    font-size: 2rem;
    font-weight: 700;
    text-align: center;
    padding: 1rem 2rem;
    ${reverseMedia.largeMobile} {
      font-size: 2rem;
    }

    ${reverseMedia.tablet} {
      font-size: 2.5rem;
      padding-top: 1.5rem;
      /* padding-left: 2rem; */
    }

    ${reverseMedia.laptop} {
      font-size: 3rem;
      padding-top: 3rem;
      padding-left: 4rem;
    }
  }

  & .highlighted_text {
    color: ${(props) => props.theme.fixedColors.tealGreen};
  }

  & .steps_container {
    > ul {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-items: flex-start;
      overflow: visible;

      ${reverseMedia.largeMobile} {
        transform: translateX(0) !important;
        margin-left: 0;
        justify-content: center;
        gap: 2rem;
        width: 100%;
        margin-top: 4rem;
      }
    }

    ${reverseMedia.largeMobile} {
      width: 95%;
      /* margin-top: 2rem; */
    }

    ${reverseMedia.largeLaptop} {
      width: 80%;
    }

    width: 100%;
    margin: 0 auto;
    overflow-x: hidden;
    align-self: center;
    display: flex;
    flex-direction: row;
    /* justify-content: center; */
    cursor: grabbing;
  }

  & .step_box {
    -webkit-user-select: none; /* Safari */
    -ms-user-select: none; /* IE 10 and IE 11 */
    user-select: none; /* Standard syntax */
    flex: 0 0 min(90%, 450px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1rem;
    padding: 1rem;
    min-width: fit-content;
    /* box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); */
    background-color: ${(props) => props.theme.fixedColors.white};
    /* max-height: 400px;
    min-height: 400px; */
    position: relative;
    /* overflow: visible; */

    ${reverseMedia.largeMobile} {
      padding: 0;
    }

    ${reverseMedia.largeMobile} {
      box-shadow: unset;
    }
  }

  & .index_no {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 13rem;
    line-height: 1;
    opacity: 0.1;
    font-weight: 900;
    font-family: "Poppins", sans-serif;
    color: ${(props) => props.theme.fixedColors.black};
    z-index: 9;

    ${reverseMedia.largeMobile} {
      font-size: 10rem;
    }

    ${reverseMedia.tablet} {
      font-size: 12rem;
    }

    ${reverseMedia.laptop} {
      font-size: 13rem;
    }
  }

  & .step_graphic {
    aspect-ratio: 1 / 1;
    /* object-fit: cover; */
    height: 200px;
    z-index: 10;
    align-self: center;
    object-fit: contain;

    ${reverseMedia.largeMobile} {
      height: 150px;
    }
    ${reverseMedia.tablet} {
      height: 150px;
    }
    ${reverseMedia.laptop} {
      height: 200px;
    }
  }

  & .step_title {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1;
    margin-top: 1rem;

    ${reverseMedia.tablet} {
      font-size: 1.5rem;
      margin-top: 2rem;
    }
  }

  & .step_description {
    font-size: 1rem;
    font-weight: 400;
    opacity: 0.7;
    text-align: left;
    margin-bottom: 0.8em;
  }
`;
