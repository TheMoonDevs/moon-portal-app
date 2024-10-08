import media from "@/styles/media";
import styled from "@emotion/styled";

export const JobApplicationPageStyled = styled.div`
  position: relative;
  background-color: white;
  font-size: 1.5rem;
  display: block;

  ${media.laptop} {
    font-size: 1.2rem;
  }
  ${media.tablet} {
    font-size: 1rem;
  }

  & .overlay_gradient {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(to bottom, black, transparent);
  }

  & .content_section {
    display: flex;
    justify-content: center;
    padding-top: 6em;
    padding-bottom: 5em;

    ${media.tablet} {
      padding-top: 5em;
    }
  }

  & .content_wrapper {
    position: relative;
    inset: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    max-width: ${(props) => props.theme.contentWidths.headerMaxWidth};

    ${media.largeLaptop} {
      max-width: unset;
    }
  }

  & .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 2rem 5em;
    z-index: 100;
    position: absolute;

    ${media.tablet} {
      padding: 1rem 2em;
      flex-wrap: wrap-reverse;
    }
  }

  & .header_nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: "DB Mono", monospace;
    font-size: 0.8em;
    overflow: hidden;
    & a {
      color: ${(props) => props.theme.colors.black};
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
  }

  & .header_text {
    font-size: 1em;
    color: ${(props) => props.theme.colors.black};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  & .logo_container {
    display: flex;
    column-gap: 0.5em;
    justify-content: space-between;
    align-items: center;
  }

  & .logo_text {
    color: #ffffff;
    font-weight: 400;
    font-size: 1rem;
    font-family: "Montserrat", "sans-serif";
  }

  & .logo_img {
    filter: invert(100%);
    width: 2rem;
    aspect-ratio: 1 / 1;
    ${media.tablet} {
      width: 1rem;
    }
  }

  & .main_content {
    inset: 0;
    padding: 0 3em 1.5em 3em;
    ${media.tablet} {
      padding: 0 1em 1.5em 1em;
    }
  }

  & .job_section {
    background-color: white;
    border-radius: 3rem;
    min-height: 100vh;
    padding: 3em 4em;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 3em;
    ${media.largeMobile} {
      padding: 3em 2em;
    }
  }

  & .job_header {
    width: fit-content;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.7em;
  }

  & .indicator {
    background-color: rgb(34 197 94);
    width: 4rem;
    height: 0.2em;
    border-radius: 20%;

    ${media.tablet} {
      width: 3rem;
    }
  }

  & .job_header_text {
    color: rgb(34 197 94);
    font-size: 1rem;
  }

  & .job_container {
    display: flex;
    gap: 3em;
    justify-content: space-evenly;
    align-items: flex-start;
    ${media.tablet} {
      flex-direction: column;
    }
  }
`;
