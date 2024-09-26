import media from "@/styles/media";
import styled from "@emotion/styled";

export const WorklifeDetailsStyled = styled.div`
  width: 100%;
  font-family: "Didact Gothic", sans-serif;
  background-color: white;
  color: black;
  padding: 3em 0 2em 0;

  & .wl_details_heading {
    padding: 0 1em;
    font-size: 1.7em;
  }

  & .wl_details_paragraph {
    padding: 2em;
    font-size: 0.9em;
  }

  & .wl_images_container {
    padding: 1rem;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 2rem 0;
    flex-wrap: wrap;
  }

  & .large_container {
    width: 50%;
    padding: 0 1rem;

    ${media.largeMobile} {
      width: 100%;
    }
  }

  & .small_container {
    width: 25%;
    padding: 0 1rem;

    ${media.laptop} {
      width: 50%;
    }

    ${media.largeMobile} {
      width: 100%;
    }
  }
`;

export const WorklifeImageCardStyled = styled.div`
  position: relative;
  flex-shrink: 1;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border-radius: 1rem;
  cursor: pointer;

  & .wl_details_image {
    width: 100%;
    object-fit: cover;
    aspect-ratio: 4/3;
    transition: all 300ms ease-in-out;
  }

  & .wl_image_description {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    // inset: 85% 0 0 0;
    display: flex;
    justify-content: between;
    align-items: center;
    font-size: 0.8em;
    gap: 0.5em;
    background-color: inherit;
    padding: 0.8em;
    z-index: 11;

    & .wl_image_title {
      width: 100%;
      flex-shrink: 1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    & .wl_image_subtitle {
      flex-shrink: 0;
      text-align: right;
      color: rgba(0, 0, 0, 0.5);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  &:hover,
  &:focus {
    & .image_bottom_box,
    & .bottom_gradient {
      opacity: 1;
    }

    & .image_bottom_box {
      transform: translateY(0%);
    }

    & .wl_details_image {
      transform: scale(1.1);
    }
  }

  & .image_bottom_box {
    position: absolute;
    bottom: 2.5em;
    left: 0;
    right: 0;
    z-index: 10;
    width: 100%;
    opacity: 0;
    color: #fff;
    padding: 0.5rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    transition: all 300ms ease-in-out;
    transform: translateY(100%);
  }

  & .image_title {
    font-weight: bold;
    font-size: 2em;
    line-height: 1.2;
    max-width: 80%;
  }

  & .image_description {
    font-family: "DB Mono", monospace;
    font-size: 0.7em;
    max-width: 80%;
    opacity: 0.8;
  }

  & .round_fab {
    min-width: 2em;
    min-height: 2em;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    background-color: white;
    color: black;
    margin-bottom: 0.5em;
  }

  & .bottom_gradient {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    opacity: 0;
    transition: opacity 300ms ease-in-out;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
  }
`;
