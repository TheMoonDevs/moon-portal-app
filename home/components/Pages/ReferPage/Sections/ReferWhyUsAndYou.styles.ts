import { reverseMedia } from "@/styles/media";
import styled from "@emotion/styled";

export const ReferWhyUsAndYouStyled = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  position: relative;
  background-color: ${(props) => props.theme.fixedColors.black};

  & .title {
    position: sticky;
    right: 0px;
    width: 50vw;
    left: 130px;
    text-align: left;
    font-size: 1.5rem;
    font-weight: 700;
    color: ${(props) => props.theme.fixedColors.white};
    padding-bottom: 1.5rem;

    ${reverseMedia.laptop} {
      width: 100%;
      text-align: left;
      font-size: 2rem;
      font-weight: 700;
      color: ${(props) => props.theme.fixedColors.white};
      padding-top: 4rem;
    }

    & strong {
      color: ${(props) => props.theme.fixedColors.tealGreenText};
    }
  }
  & .wrapper {
    width: 100%;
    position: relative;
    background-color: ${(props) => props.theme.fixedColors.black};
    display: flex;
    flex-direction: row;
    z-index: 1;
    justify-content: flex-end;
    align-items: start;
    gap: 1rem;
    padding: 5rem 1rem;

    ${reverseMedia.laptop} {
      margin: 0;
      padding: 8rem;
    }
    & .image_wrapper {
      margin-bottom: 100px;
    }
    & .image {
      width: 100px;
      height: 300px;
      object-fit: contain;
      ${reverseMedia.laptop} {
        width: 200px;
        height: 300px;
      }
    }

    & .right {
      width: 80vw;
      color: black;
      position: sticky;
      top: 100px;
    }

    & .content {
      /* height: 100vh; */

      & .paragraph_container {
        font-weight: bold;
        font-size: 2rem;
        width: 60vw;

        ${reverseMedia.laptop} {
          font-weight: bold;
          font-size: 3rem;
        }

        & .heading {
          font-size: 1.5rem;
          background: white;
          padding: 1rem 1rem;
          ${reverseMedia.laptop} {
            font-size: 2rem;
            padding: 2rem 2rem;
          }
        }

        & .description {
          font-weight: 300;
          font-size: 0.5em;
          opacity: 0.5;
          color: white;
          margin-top: 1rem;
          /* padding: 0 1.5rem; */
          ${reverseMedia.laptop} {
            font-weight: 300;
            font-size: 1.5rem;
            color: white;
            margin-top: 2rem;
          }
        }
      }
    }
  }

  & .right:last-child {
    height: 300px !important;
  }
`;
