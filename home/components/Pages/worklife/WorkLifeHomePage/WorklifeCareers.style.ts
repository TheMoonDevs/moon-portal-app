import media from "@/styles/media";
import { HorizontalMiniScrollBar } from "@/styles/snippets";
import styled from "@emotion/styled";

export const WorklifeCareersStyled = styled.div`
  position: relative;
  background-color: #ffffff;
  height: fit-content;

  & .wl_careers_title {
    font-size: 1.7em;
    color: #000000;
    padding: 0em 1em 1em 1.2em;
  }

  & .jobs_container {
    width: 100%;
    padding: 0em 0px 4em 2em;
    display: flex;
    justify-content: start;
    align-items: start;
    flex-wrap: nowrap;
    overflow-x: scroll;
    gap: 2em;
    ${HorizontalMiniScrollBar("#000")}
  }
`;

export const WorklifeJobsCardStyled = styled.div`
  display: flex;
  padding: 2.5rem;
  flex-direction: column;
  shrink: 0;
  gap: 2rem;
  justify-content: center;
  align-items: center;
  border-radius: 1.5rem;
  width: 100%;
  max-width: 350px;
  min-width: 350px;
  cursor: pointer;
  transition: box-shadow 0.5s ease-in-out;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);

  :hover {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

    & .jobs_container_button {
      opacity: 1;
      color: #ffffff;
      background-color: ${(props) => props.theme.colors.white};
    }
  }

  ${media.largeMobile} {
    padding: 0.5rem;
    gap: 1rem;
  }

  .wl_jobs_image {
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 100%;
    width: 150px;

    ${media.largeMobile} {
      width: 100px;
    }
  }

  & .jobs_container_title {
    overflow: hidden;
    color: #000000;
    text-align: center;
    text-overflow: ellipsis;
    max-height: 3em;
    min-height: 1.5em;
    font-size: 1em;
    line-height: 1.5em;
    font-weight: 700;

    ${media.largeMobile} {
      font-size: 0.9em;
    }
  }

  & .jobs_container_description {
    font-size: 0.7em;
    overflow: hidden;
    text-align: center;
    text-overflow: ellipsis;
    max-height: 4.5em;
    min-height: 4.5em;
    color: #00000090;

    ${media.largeMobile} {
      max-height: 0em;
      padding: 0 10%;
      text-align: center;
    }
  }

  & .jobs_container_button {
    opacity: 1;
    font-size: 0.6em;
    padding: 0.75rem 0;
    text-align: center;
    border-radius: 2rem;
    width: 100%;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #000;
    background-color: transparent;
    transition: all 0.25s ease-in-out;

    ${media.tablet} {
      opacity: 1;
    }

    ${media.largeMobile} {
      opacity: 1;
      color: #ffffff;
      background-color: ${(props) => props.theme.colors.white};
      width: 50%;
      padding: 0.5rem 0.5;
      font-size: 0.5em;
    }
  }
`;
